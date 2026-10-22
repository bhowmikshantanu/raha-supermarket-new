"""Offline tests for marketing audience safety. No Firebase or SMS provider needed."""
import unittest
from datetime import datetime, timedelta, timezone
from marketing_crm import normalize_indian_mobile, build_marketing_audience, preview_campaign

NOW = datetime(2026, 10, 22, tzinfo=timezone.utc)

class MarketingCRMTests(unittest.TestCase):
    def test_mobile_normalization(self):
        self.assertEqual(normalize_indian_mobile("98765 43210"), "+919876543210")
        self.assertEqual(normalize_indian_mobile("+91-9876543210"), "+919876543210")
        self.assertIsNone(normalize_indian_mobile("12345"))

    def test_requires_explicit_consent(self):
        rows = [
            {"phone":"9876543210", "marketingSmsConsent":True},
            {"phone":"9876543211"},
            {"phone":"9876543212", "marketingSmsConsent":False},
            {"phone":"9876543213", "marketingSmsConsent":True, "marketingSmsOptOut":True},
        ]
        self.assertEqual(len(build_marketing_audience(rows, now=NOW)), 1)

    def test_deduplication(self):
        rows = [{"phone":"9876543210","marketingSmsConsent":True},
                {"mobile":"+919876543210","marketingSmsConsent":True}]
        self.assertEqual(len(build_marketing_audience(rows, now=NOW)), 1)

    def test_active_inactive(self):
        rows = [{"phone":"9876543210","marketingSmsConsent":True,"lastOrderAt":NOW-timedelta(days=5)},
                {"phone":"9876543211","marketingSmsConsent":True,"lastOrderAt":NOW-timedelta(days=50)}]
        self.assertEqual(len(build_marketing_audience(rows, segment="active", now=NOW)), 1)
        self.assertEqual(len(build_marketing_audience(rows, segment="inactive", now=NOW)), 1)

    def test_preview_has_no_phone_numbers(self):
        result = preview_campaign([{"phone":"9876543210","marketingSmsConsent":True}])
        self.assertEqual(result["mode"], "PREVIEW_ONLY")
        self.assertEqual(result["eligibleRecipients"], 1)
        self.assertNotIn("phone", str(result))

    def test_invalid_segment(self):
        with self.assertRaises(ValueError):
            build_marketing_audience([], segment="everyone")

if __name__ == "__main__":
    unittest.main()
