#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## Iteration 3 — Final Stabilization Pass (main agent, June 2026 fork)

### Changes implemented this iteration:
1. **Admin Orders rider visibility fix** (`/app/admin-app/app/admin/orders/index.tsx` + `/app/admin-app/src/services/firebaseOrders.ts`)
   - Root cause: `documentToOrder` in firebaseOrders.ts stripped deliveryBoy* fields → admin never saw assignments.
   - Now: collapsed card shows rider strip ("Assigned to X" / "Out for delivery · X" / "Delivered by X"); expanded card shows Assigned to/Delivered by + Mobile + Vehicle (looked up from deliveryBoys collection) + Assigned at + Delivered at; button says "Change delivery boy" when assigned, "Assign rider" when not; delivered/cancelled orders show NO assign button.
2. **Auth session clobbering fix** (`firebaseOrders.ts` + `pushNotifications.ts` ensureFirebaseUser)
   - Root cause: signInAnonymously ran before persisted admin/rider session restored on page refresh/app restart, replacing the login with a fresh anonymous user → "Unable to load live orders".
   - Now waits for initial onAuthStateChanged emission before falling back to anonymous.
3. **Admin orders subscriptions gated on auth-ready** (onAuthStateChanged) so refresh works.
4. **expo-notifications web guards** (`app/_layout.tsx`, `src/services/pushNotifications.ts`) — all native notification APIs skipped when Platform.OS === 'web'. Android behavior unchanged.

### Verified by main agent (real production Firebase + Railway):
- Firestore: RH78387575 status=delivered, deliveryBoyName=Pradeep, vehicle=up32nb6543, all timestamps present.
- Rider login via Firebase REST OK; POST /api/orders/RH78387575/customer-notify with rider token → 200 {"ok":true,"sent":1} (real push accepted by Expo).
- Role isolation: rider→foreign order 403, no auth 401, rider→admin endpoint 403.
- Web UI (after full page refresh): admin login → /admin/orders → RH78387575 expanded shows "Delivered by Pradeep", vehicle, timestamps, NO Assign rider button.

### Credentials: see /app/memory/test_credentials.md (admin + Pradeep rider). LIVE PRODUCTION Firebase — do not change passwords, do not delete Pradeep, do not modify order RH78387575 (read-only).

## Iteration 4 — COD Release Validation (main agent, fork)

### Verified by main agent (no code changes except ESLint quote-escape fix in src/components/HomeHeader.tsx):
- TypeScript: 0 errors. ESLint: 0 errors (7 warnings). Expo Doctor 18/18.
- Root URL `/` → customer splash → onboarding (fresh) — NOT admin login. Console clean (only shadow*/expo-notifications web info warnings).
- Firestore rules (deployed ruleset read via Rules API) probed with anon customer / rider / admin ID tokens — 23/25 least-privilege checks PASS; 2 "fails" were probe artefacts (pushTokens doc for rider did not exist). Live data fully restored.
- Railway backend: `/`→200, `/api/`→200, auth guards 401/403 correct, rider token → nonexistent order → 404 (Firebase Admin + Firestore live). `/api/status` returns 503 "MongoDB is not configured" on Railway (older deploy) — the app never calls it, non-blocking.

### Needs UI E2E by testing agent (Iteration 4):
Full COD lifecycle in the web preview: customer places COD order → admin confirms → admin assigns Pradeep → admin changes rider (reassign to same Pradeep OK if only one rider) → rider sees ONLY assigned orders → rider Out for delivery → rider Delivered → admin shows "Delivered by Pradeep" → customer Orders tab shows Delivered.
