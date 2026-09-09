from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    Header,
    HTTPException,
    status,
)
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

import firebase_admin
from firebase_admin import (
    auth as firebase_auth,
    credentials,
    firestore,
)

import httpx
import json
import logging
import os
from pathlib import Path

from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import uuid
from datetime import datetime


# =========================================================
# BASIC CONFIGURATION
# =========================================================

ROOT_DIR = Path(__file__).parent

load_dotenv(ROOT_DIR / ".env")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


# =========================================================
# OPTIONAL MONGODB
# =========================================================
#
# MongoDB is currently only used by the old /status
# test endpoints.
#
# Production backend must NOT crash if MongoDB
# is not configured.
#

mongo_url = os.getenv("MONGO_URL", "").strip()

db_name = os.getenv(
    "DB_NAME",
    "test_database",
).strip()


client: Optional[AsyncIOMotorClient]

if mongo_url:
    client = AsyncIOMotorClient(
        mongo_url,
    )

    db = client[
        db_name
    ]

    logger.info(
        "MongoDB configured."
    )

else:
    client = None
    db = None

    logger.info(
        "MongoDB is not configured. "
        "Mongo-dependent test endpoints will be unavailable."
    )


# =========================================================
# FIREBASE ADMIN
# =========================================================

def initialize_firebase_admin() -> None:
    if firebase_admin._apps:
        return

    service_account_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        "",
    ).strip()

    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH",
        "",
    ).strip()

    project_id = os.getenv(
        "FIREBASE_PROJECT_ID",
        "",
    ).strip()

    # -----------------------------------------------------
    # PRODUCTION / RAILWAY
    # Firebase credentials stored as environment variable
    # -----------------------------------------------------

    if service_account_json:
        try:
            info = json.loads(
                service_account_json
            )
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON "
                "contains invalid JSON."
            ) from exc

        cred = credentials.Certificate(
            info
        )

        options = {}

        resolved_project_id = (
            project_id
            or info.get("project_id")
        )

        if resolved_project_id:
            options[
                "projectId"
            ] = resolved_project_id

        firebase_admin.initialize_app(
            cred,
            options or None,
        )

        logger.info(
            "Firebase Admin initialized "
            "from FIREBASE_SERVICE_ACCOUNT_JSON."
        )

        return

    # -----------------------------------------------------
    # LOCAL DEVELOPMENT
    # -----------------------------------------------------

    if service_account_path:
        path = Path(
            service_account_path
        )

        if not path.is_absolute():
            path = (
                ROOT_DIR
                / path
            )

        if not path.exists():
            raise RuntimeError(
                "Firebase service account "
                f"file not found: {path}"
            )

        cred = credentials.Certificate(
            str(path)
        )

        options = {}

        if project_id:
            options[
                "projectId"
            ] = project_id

        firebase_admin.initialize_app(
            cred,
            options or None,
        )

        logger.info(
            "Firebase Admin initialized "
            "from service account file."
        )

        return

    # -----------------------------------------------------
    # GOOGLE DEFAULT CREDENTIALS FALLBACK
    # -----------------------------------------------------

    try:
        options = {}

        if project_id:
            options[
                "projectId"
            ] = project_id

        firebase_admin.initialize_app(
            options=options or None
        )

        logger.info(
            "Firebase Admin initialized "
            "using default credentials."
        )

    except Exception as exc:
        raise RuntimeError(
            "Firebase Admin credentials are not configured. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON "
            "or FIREBASE_SERVICE_ACCOUNT_PATH."
        ) from exc


initialize_firebase_admin()

firestore_db = firestore.client()


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Raha Supermarket Backend",
    version="1.0.0",
)

api_router = APIRouter(
    prefix="/api"
)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "Raha Supermarket Backend",
    }


@api_router.get("/")
async def api_root():
    return {
        "message": "Raha Supermarket API",
        "status": "ok",
    }


# =========================================================
# OLD STATUS TEST ENDPOINTS
# =========================================================

class StatusCheck(BaseModel):
    id: str = Field(
        default_factory=lambda: str(
            uuid.uuid4()
        )
    )

    client_name: str

    timestamp: datetime = Field(
        default_factory=datetime.utcnow
    )


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.post(
    "/status",
    response_model=StatusCheck,
)
async def create_status_check(
    input: StatusCheckCreate,
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is not configured.",
        )

    status_obj = StatusCheck(
        **input.model_dump()
    )

    await db.status_checks.insert_one(
        status_obj.model_dump()
    )

    return status_obj


@api_router.get(
    "/status",
)
async def get_status():
    """Lightweight production health check (no MongoDB required)."""

    return {
        "ok": True,
        "service": "raha-supermarket-backend",
        "firebase": firestore_db is not None,
        "mongo": db is not None,
    }


@api_router.get(
    "/status/checks",
    response_model=List[StatusCheck],
)
async def get_status_checks():
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB is not configured.",
        )

    status_checks = (
        await db.status_checks
        .find()
        .to_list(1000)
    )

    return [
        StatusCheck(
            **item
        )
        for item in status_checks
    ]


# =========================================================
# PUSH NOTIFICATION TYPES
# =========================================================

NotificationChannel = Literal[
    "general",
    "offers",
    "orders",
]


class AdminPushNotificationRequest(
    BaseModel
):
    title: str = Field(
        min_length=1,
        max_length=100,
    )

    body: str = Field(
        min_length=1,
        max_length=500,
    )

    channel: NotificationChannel = (
        "general"
    )

    route: Optional[str] = (
        "/notifications"
    )


class AdminPushNotificationResponse(
    BaseModel
):
    recipientCount: int
    acceptedCount: int
    failedCount: int
    campaignId: str


EXPO_PUSH_ENDPOINT = (
    "https://exp.host/--/api/v2/push/send"
)


# =========================================================
# ADMIN AUTHENTICATION
# =========================================================

async def require_admin(
    authorization: Optional[str] = Header(
        default=None
    ),
) -> dict:

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, separator, token = (
        authorization.partition(" ")
    )

    if (
        separator != " "
        or scheme.lower() != "bearer"
        or not token.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header.",
        )

    try:
        decoded = (
            firebase_auth.verify_id_token(
                token.strip()
            )
        )

    except Exception as exc:
        logger.warning(
            "Admin Firebase token verification failed."
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired admin token.",
        ) from exc

    uid = decoded.get(
        "uid"
    )

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verified token has no uid.",
        )

    try:
        admin_snapshot = (
            firestore_db
            .collection("admins")
            .document(uid)
            .get()
        )

    except Exception as exc:
        logger.exception(
            "Unable to read administrator record."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify administrator account.",
        ) from exc

    if not admin_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not an administrator.",
        )

    admin_data = (
        admin_snapshot.to_dict()
        or {}
    )

    if (
        admin_data.get("active")
        is not True
        or admin_data.get("role")
        != "admin"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access is disabled.",
        )

    return {
        "uid": uid,
        "email": (
            decoded.get("email")
            or admin_data.get("email")
        ),
    }


async def require_delivery(
    authorization: Optional[str] = Header(
        default=None
    ),
) -> dict:
    """Verify the caller is an active delivery boy (rider)."""

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    scheme, separator, token = (
        authorization.partition(" ")
    )

    if (
        separator != " "
        or scheme.lower() != "bearer"
        or not token.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header.",
        )

    try:
        decoded = firebase_auth.verify_id_token(
            token.strip()
        )

    except Exception as exc:
        logger.warning(
            "Delivery Firebase token verification failed."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired delivery token.",
        ) from exc

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verified token has no uid.",
        )

    try:
        rider_snapshot = (
            firestore_db
            .collection("deliveryBoys")
            .document(uid)
            .get()
        )
    except Exception as exc:
        logger.exception(
            "Unable to read delivery boy record."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify delivery boy account.",
        ) from exc

    if not rider_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is not registered as a delivery boy.",
        )

    rider_data = rider_snapshot.to_dict() or {}

    if rider_data.get("active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Delivery boy account is deactivated.",
        )

    return {
        "uid": uid,
        "email": decoded.get("email") or rider_data.get("email"),
        "name": rider_data.get("name"),
        "mobile": rider_data.get("mobile"),
    }


async def require_admin_or_delivery(
    authorization: Optional[str] = Header(
        default=None
    ),
) -> dict:
    """Accept either an admin OR delivery boy Firebase ID token."""

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    # Try admin first, fall back to delivery. Both raise 401/403 on failure.
    try:
        actor = await require_admin(
            authorization=authorization
        )
        return {**actor, "role": "admin"}
    except HTTPException as admin_error:
        # 401 == token invalid entirely, no point in re-checking.
        if admin_error.status_code == status.HTTP_401_UNAUTHORIZED:
            raise

    actor = await require_delivery(
        authorization=authorization
    )
    return {**actor, "role": "delivery"}


# =========================================================
# EXPO PUSH HELPERS
# =========================================================

def is_expo_push_token(
    value: str,
) -> bool:

    return (
        value.startswith(
            "ExponentPushToken["
        )
        or value.startswith(
            "ExpoPushToken["
        )
    )


def get_active_customer_push_tokens() -> list[str]:

    tokens: list[str] = []

    try:
        documents = (
            firestore_db
            .collection("pushTokens")
            .stream()
        )

        for document in documents:
            data = (
                document.to_dict()
                or {}
            )

            token = data.get(
                "expoPushToken"
            )

            if (
                data.get("active")
                is True
                and data.get("role")
                == "customer"
                and isinstance(
                    token,
                    str,
                )
                and is_expo_push_token(
                    token.strip()
                )
            ):
                tokens.append(
                    token.strip()
                )

    except Exception as exc:
        logger.exception(
            "Unable to load customer push tokens."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read customer push tokens.",
        ) from exc

    # remove duplicates but preserve order
    return list(
        dict.fromkeys(
            tokens
        )
    )


def chunk_list(
    values: list[str],
    size: int,
) -> list[list[str]]:

    return [
        values[
            i:i + size
        ]
        for i
        in range(
            0,
            len(values),
            size,
        )
    ]


async def send_expo_push_batch(
    tokens: list[str],
    payload: AdminPushNotificationRequest,
) -> list[dict]:

    notification_type = (
        "offer"
        if payload.channel
        == "offers"
        else (
            "order"
            if payload.channel
            == "orders"
            else "system"
        )
    )

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": (
                payload.title
                .strip()
            ),
            "body": (
                payload.body
                .strip()
            ),
            "channelId": (
                payload.channel
            ),
            "data": {
                "type": notification_type,
                "route": (
                    (
                        payload.route
                        or "/notifications"
                    ).strip()
                    or "/notifications"
                ),
            },
        }
        for token in tokens
    ]

    logger.info(
        "Sending Expo push batch "
        "to %s device(s).",
        len(tokens),
    )

    try:
        async with httpx.AsyncClient(
            timeout=30.0
        ) as http_client:

            response = (
                await http_client.post(
                    EXPO_PUSH_ENDPOINT,
                    headers={
                        "Accept":
                            "application/json",

                        "Content-Type":
                            "application/json",
                    },
                    json=messages,
                )
            )

    except httpx.RequestError as exc:
        logger.exception(
            "Expo Push Service request failed."
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to reach Expo Push Service."
            ),
        ) from exc

    logger.info(
        "Expo Push response status=%s",
        response.status_code,
    )

    if not response.is_success:

        logger.error(
            "Expo Push Service failure: %s",
            response.text,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Expo Push Service failed: "
                f"{response.status_code} "
                f"{response.text}"
            ),
        )

    try:
        payload_json = (
            response.json()
        )

    except Exception as exc:
        logger.exception(
            "Invalid JSON returned by Expo Push Service."
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Expo Push Service returned "
                "an invalid response."
            ),
        ) from exc

    logger.info(
        "Expo Push response body=%s",
        payload_json,
    )

    data = payload_json.get(
        "data",
        [],
    )

    if isinstance(
        data,
        dict,
    ):
        return [
            data
        ]

    if isinstance(
        data,
        list,
    ):
        return data

    return []


# =========================================================
# ADMIN SEND NOTIFICATION
# =========================================================

@api_router.post(
    "/admin/notifications/send",
    response_model=AdminPushNotificationResponse,
)
async def send_admin_notification(
    payload: AdminPushNotificationRequest,
    admin: dict = Depends(
        require_admin
    ),
):

    logger.info(
        "Admin notification request received "
        "from uid=%s",
        admin["uid"],
    )

    tokens = (
        get_active_customer_push_tokens()
    )

    logger.info(
        "Found %s active customer "
        "push token(s).",
        len(tokens),
    )

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No active customer "
                "push-notification devices "
                "are registered yet."
            ),
        )

    accepted_count = 0
    failed_count = 0

    for token_batch in chunk_list(
        tokens,
        100,
    ):

        tickets = (
            await send_expo_push_batch(
                token_batch,
                payload,
            )
        )

        for index, token in enumerate(
            token_batch
        ):

            ticket = (
                tickets[index]
                if index < len(tickets)
                else {}
            )

            if (
                ticket.get("status")
                == "ok"
            ):
                accepted_count += 1

            else:
                failed_count += 1

                logger.warning(
                    "Expo push ticket failed "
                    "for %s: %s",
                    token,
                    ticket,
                )

    # -----------------------------------------------------
    # Save notification campaign history to Firestore
    # -----------------------------------------------------

    try:
        campaign_reference = (
            firestore_db
            .collection(
                "notificationCampaigns"
            )
            .document()
        )

        campaign_reference.set(
            {
                "title":
                    payload.title.strip(),

                "body":
                    payload.body.strip(),

                "channel":
                    payload.channel,

                "route":
                    (
                        (
                            payload.route
                            or "/notifications"
                        ).strip()
                        or "/notifications"
                    ),

                "recipientCount":
                    len(tokens),

                "acceptedCount":
                    accepted_count,

                "failedCount":
                    failed_count,

                "createdByUid":
                    admin["uid"],

                "createdByEmail":
                    admin.get(
                        "email"
                    ),

                "createdAt":
                    firestore.SERVER_TIMESTAMP,
            }
        )

    except Exception as exc:

        logger.exception(
            "Push notification was sent "
            "but campaign history could not "
            "be written to Firestore."
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Notification was processed, "
                "but campaign history could not "
                "be saved."
            ),
        ) from exc

    logger.info(
        "Notification campaign complete: "
        "recipients=%s accepted=%s failed=%s",
        len(tokens),
        accepted_count,
        failed_count,
    )

    return AdminPushNotificationResponse(
        recipientCount=len(
            tokens
        ),

        acceptedCount=
            accepted_count,

        failedCount=
            failed_count,

        campaignId=
            campaign_reference.id,
    )


# =========================================================
# ROUTER
# =========================================================

# ---------------------------------------------------------
# DELIVERY BOY MANAGEMENT (Admin only)
# ---------------------------------------------------------


class CreateDeliveryBoyRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    mobile: str = Field(min_length=10, max_length=15)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    vehicleNumber: Optional[str] = Field(
        default=None, max_length=32
    )


class DeliveryBoyResponse(BaseModel):
    id: str
    firebaseUid: str
    name: str
    mobile: str
    email: str
    active: bool
    vehicleNumber: Optional[str] = None
    createdAtMs: int


class ResetDeliveryPasswordRequest(BaseModel):
    password: str = Field(min_length=6, max_length=128)


def _normalize_mobile(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


@api_router.post(
    "/admin/delivery-boys/create",
    response_model=DeliveryBoyResponse,
)
async def admin_create_delivery_boy(
    payload: CreateDeliveryBoyRequest,
    admin: dict = Depends(require_admin),
):
    """Create a Firebase Auth user and a `deliveryBoys/{uid}` document."""

    name = payload.name.strip()
    mobile = _normalize_mobile(payload.mobile)
    email = payload.email.strip().lower()

    if len(mobile) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit mobile number.",
        )

    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address.",
        )

    # Create Firebase Auth user.
    try:
        user_record = firebase_auth.create_user(
            email=email,
            password=payload.password,
            display_name=name,
            email_verified=False,
            disabled=False,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )
    except Exception as exc:
        logger.exception("Firebase user creation failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create delivery boy account.",
        ) from exc

    now_ms = int(datetime.utcnow().timestamp() * 1000)

    doc_payload: dict = {
        "name": name,
        "mobile": mobile,
        "email": email,
        "firebaseUid": user_record.uid,
        "active": True,
        "role": "delivery",
        "createdAtMs": now_ms,
        "createdByAdminUid": admin["uid"],
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if payload.vehicleNumber:
        doc_payload["vehicleNumber"] = payload.vehicleNumber.strip()

    try:
        firestore_db.collection("deliveryBoys").document(
            user_record.uid
        ).set(doc_payload)
    except Exception as exc:
        # Roll back the auth user so we don't strand orphan credentials.
        try:
            firebase_auth.delete_user(user_record.uid)
        except Exception:
            logger.exception(
                "Unable to roll back Firebase user after Firestore write failure."
            )
        logger.exception(
            "Firestore delivery boy write failed."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save delivery boy record.",
        ) from exc

    return DeliveryBoyResponse(
        id=user_record.uid,
        firebaseUid=user_record.uid,
        name=name,
        mobile=mobile,
        email=email,
        active=True,
        vehicleNumber=payload.vehicleNumber,
        createdAtMs=now_ms,
    )


@api_router.post(
    "/admin/delivery-boys/{delivery_boy_id}/reset-password"
)
async def admin_reset_delivery_password(
    delivery_boy_id: str,
    payload: ResetDeliveryPasswordRequest,
    admin: dict = Depends(require_admin),
):
    """Admin-only password reset for a delivery boy."""

    try:
        firestore_db.collection("deliveryBoys").document(
            delivery_boy_id
        ).get()
    except Exception as exc:
        logger.exception("Delivery boy lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify delivery boy.",
        ) from exc

    try:
        firebase_auth.update_user(
            delivery_boy_id, password=payload.password
        )
    except firebase_auth.UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery boy account not found.",
        )
    except Exception as exc:
        logger.exception("Password reset failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to reset password.",
        ) from exc

    logger.info(
        "Admin %s reset password for delivery boy %s.",
        admin["uid"],
        delivery_boy_id,
    )
    return {"ok": True}


# ---------------------------------------------------------
# CUSTOMER PUSH TRIGGER FROM ORDER STATUS UPDATES
# ---------------------------------------------------------


class OrderCustomerNotifyRequest(BaseModel):
    status: Literal[
        "confirmed",
        "preparing",
        "out-for-delivery",
        "delivered",
        "cancelled",
    ]
    title: Optional[str] = None
    body: Optional[str] = None


_STATUS_MESSAGES: dict = {
    "confirmed": (
        "Order confirmed",
        "Your Raha Supermarket order has been confirmed.",
    ),
    "preparing": (
        "We are preparing your order",
        "Your groceries are being packed with care.",
    ),
    "out-for-delivery": (
        "Out for delivery",
        "Your order is on the way to your address.",
    ),
    "delivered": (
        "Order delivered",
        "Your order has been delivered. Thanks for shopping!",
    ),
    "cancelled": (
        "Order cancelled",
        "Your order has been cancelled. Please contact the store if unexpected.",
    ),
}


@api_router.post(
    "/orders/{order_id}/customer-notify"
)
async def customer_notify_for_order(
    order_id: str,
    payload: OrderCustomerNotifyRequest,
    actor: dict = Depends(require_admin_or_delivery),
):
    """Send a per-order push to the customer of an order.

    Reuses the same Expo Push flow the admin broadcast endpoint uses,
    but targets only the customer who placed this specific order.
    """

    try:
        order_snapshot = (
            firestore_db.collection("orders").document(order_id).get()
        )
    except Exception as exc:
        logger.exception("Order lookup failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read order.",
        ) from exc

    if not order_snapshot.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    order_data = order_snapshot.to_dict() or {}

    # Delivery boys may only push updates for their OWN orders.
    if actor.get("role") == "delivery":
        assigned = order_data.get("deliveryBoyUid")
        if assigned != actor["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This order is not assigned to you.",
            )

    customer_uid = order_data.get("customerUid")
    if not customer_uid or not isinstance(customer_uid, str):
        # Older orders may not have a customerUid. Skip silently.
        return {
            "ok": True,
            "sent": 0,
            "reason": "Order has no customer push identity.",
        }

    try:
        token_snapshot = (
            firestore_db.collection("pushTokens")
            .document(customer_uid)
            .get()
        )
    except Exception as exc:
        logger.exception("pushTokens read failed.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to read customer push token.",
        ) from exc

    if not token_snapshot.exists:
        return {"ok": True, "sent": 0, "reason": "No push token."}

    token_data = token_snapshot.to_dict() or {}
    token_value = token_data.get("expoPushToken")

    if (
        token_data.get("active") is False
        or not isinstance(token_value, str)
        or not is_expo_push_token(token_value.strip())
    ):
        return {"ok": True, "sent": 0, "reason": "Token inactive or invalid."}

    default_title, default_body = _STATUS_MESSAGES.get(
        payload.status,
        ("Order update", "Your Raha Supermarket order was updated."),
    )

    title = (payload.title or default_title).strip() or default_title
    body = (payload.body or default_body).strip() or default_body

    push_message = {
        "to": token_value.strip(),
        "sound": "default",
        "title": title,
        "body": body,
        "channelId": "orders",
        "data": {
            "type": "order",
            "orderId": order_id,
            "status": payload.status,
            "route": f"/order/{order_id}",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                EXPO_PUSH_ENDPOINT,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                json=[push_message],
            )
    except httpx.RequestError as exc:
        logger.exception("Expo push (per-order) failed.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Expo Push Service.",
        ) from exc

    accepted = 0
    failed = 0
    if response.is_success:
        try:
            body_json = response.json()
        except Exception:
            body_json = {}
        tickets = body_json.get("data") or []
        if isinstance(tickets, dict):
            tickets = [tickets]
        for ticket in tickets:
            if ticket.get("status") == "ok":
                accepted += 1
            else:
                failed += 1
    else:
        failed = 1
        logger.warning(
            "Expo push (per-order) returned %s: %s",
            response.status_code,
            response.text,
        )

    logger.info(
        "Order %s customer push by %s (%s): accepted=%s failed=%s",
        order_id,
        actor.get("uid"),
        actor.get("role"),
        accepted,
        failed,
    )

    return {
        "ok": True,
        "sent": accepted,
        "failed": failed,
    }


# =========================================================
# RAZORPAY ONLINE PAYMENTS (TEST MODE)
# =========================================================
#
# The Key Secret NEVER leaves this backend. The client only receives the
# public Key ID (returned by create-order). Every order is created here and
# every payment signature is verified here with HMAC SHA-256.
#

import hashlib
import hmac

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
RAZORPAY_ORDERS_ENDPOINT = "https://api.razorpay.com/v1/orders"


class CreateRazorpayOrderRequest(BaseModel):
    # Amount in whole rupees (INR). Converted to paise server-side.
    amount: int = Field(gt=0, le=10_000_00)
    currency: str = Field(default="INR", pattern="^[A-Z]{3}$")
    receipt: Optional[str] = Field(default=None, max_length=40)


class CreateRazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # paise
    currency: str
    key_id: str


class VerifyRazorpayPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(min_length=4, max_length=80)
    razorpay_payment_id: str = Field(min_length=4, max_length=80)
    razorpay_signature: str = Field(min_length=16, max_length=256)


def _require_razorpay_configured() -> None:
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Online payments are not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            ),
        )


@api_router.post(
    "/payments/razorpay/create-order",
    response_model=CreateRazorpayOrderResponse,
)
async def create_razorpay_order(payload: CreateRazorpayOrderRequest):
    """Create a Razorpay order. Amount is authoritative on the server."""

    _require_razorpay_configured()

    amount_paise = payload.amount * 100
    receipt = (payload.receipt or f"rcpt_{uuid.uuid4().hex[:24]}")[:40]

    body = {
        "amount": amount_paise,
        "currency": payload.currency,
        "receipt": receipt,
        "payment_capture": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as http_client:
            response = await http_client.post(
                RAZORPAY_ORDERS_ENDPOINT,
                auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
                json=body,
            )
    except httpx.RequestError as exc:
        logger.exception("Razorpay order request failed.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach the payment gateway.",
        ) from exc

    if response.is_error:
        logger.error(
            "Razorpay order creation failed: %s %s",
            response.status_code,
            response.text,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway rejected the order.",
        )

    razorpay_order = response.json()
    order_id = razorpay_order.get("id")

    if not order_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway returned an invalid order.",
        )

    # Store for idempotency + amount reconciliation. Firestore write failure
    # must not block the payment flow (verification still works via HMAC).
    try:
        firestore_db.collection("paymentOrders").document(order_id).set(
            {
                "razorpayOrderId": order_id,
                "amount": amount_paise,
                "currency": payload.currency,
                "receipt": receipt,
                "status": "created",
                "createdAt": firestore.SERVER_TIMESTAMP,
            }
        )
    except Exception:
        logger.exception(
            "Unable to persist paymentOrders record (non-fatal)."
        )

    return CreateRazorpayOrderResponse(
        order_id=order_id,
        amount=amount_paise,
        currency=payload.currency,
        key_id=RAZORPAY_KEY_ID,
    )


@api_router.post("/payments/razorpay/verify")
async def verify_razorpay_payment(payload: VerifyRazorpayPaymentRequest):
    """Verify a Razorpay payment signature (HMAC SHA-256), idempotently."""

    _require_razorpay_configured()

    # Idempotency: if we already marked this order paid, return success.
    try:
        existing = (
            firestore_db.collection("paymentOrders")
            .document(payload.razorpay_order_id)
            .get()
        )
        if existing.exists and (existing.to_dict() or {}).get("status") == "paid":
            return {"verified": True, "already_processed": True}
    except Exception:
        logger.exception("paymentOrders read failed (non-fatal).")

    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, payload.razorpay_signature):
        try:
            firestore_db.collection("paymentOrders").document(
                payload.razorpay_order_id
            ).set({"status": "verification_failed"}, merge=True)
        except Exception:
            logger.exception("paymentOrders update failed (non-fatal).")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature.",
        )

    try:
        firestore_db.collection("paymentOrders").document(
            payload.razorpay_order_id
        ).set(
            {
                "status": "paid",
                "razorpayPaymentId": payload.razorpay_payment_id,
                "verifiedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
    except Exception:
        logger.exception("paymentOrders paid update failed (non-fatal).")

    return {"verified": True, "order_id": payload.razorpay_order_id}



app.include_router(
    api_router
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_credentials=True,

    allow_origins=[
        "*"
    ],

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# =========================================================
# SHUTDOWN
# =========================================================

@app.on_event(
    "shutdown"
)
async def shutdown_db_client():

    if client is not None:
        client.close()

        logger.info(
            "MongoDB client closed."
        )

    else:
        logger.info(
            "Application shutdown complete."
        )