from marketing_crm import build_marketing_audience, normalize_indian_mobile, preview_campaign


def test_phone_normalization():
    assert normalize_indian_mobile('9876543210') == '+919876543210'
    assert normalize_indian_mobile('123') is None


def test_requires_consent_and_deduplicates():
    customers = [
        {'phone': '9876543210', 'marketingSmsConsent': True},
        {'phone': '+919876543210', 'marketingSmsConsent': True},
        {'phone': '9876543211', 'marketingSmsConsent': False},
        {'phone': '9876543212', 'marketingSmsConsent': True, 'marketingSmsOptOut': True},
    ]
    assert len(build_marketing_audience(customers)) == 1
    assert preview_campaign(customers)['eligibleRecipients'] == 1
