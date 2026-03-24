# Google Play Health Compliance Checklist

Use this checklist before submitting or updating ShiftCoach in Play Console.

## Account and data deletion

- In-app deletion path exists: `/account/delete`
- Public web deletion request page exists: `/account/delete-request`
- API-backed deletion endpoint exists: `/api/account/delete`
- User-scoped public table data deletion function exists: `public.delete_user_account_data(uuid)`
- Deletion requests are tracked in `public.account_deletion_requests`

## Play Console setup

- In **App content -> Data safety**, ensure disclosures match actual app behavior.
- In **App content -> Data deletion**, set the web deletion URL to:
  - `https://www.shiftcoach.app/account/delete-request`
- Confirm in-app deletion instructions point to Settings/account deletion.

## Health data handling

- Android wearable/health ingestion uses Health Connect path(s).
- iOS health ingestion uses Apple Health path(s).
- Google Fit onboarding/data endpoints are deprecated and not active for onboarding.

## Validation evidence to keep

- Screenshot of in-app account deletion flow.
- Screenshot of web deletion request page.
- DB evidence of deletion request row in `account_deletion_requests`.
- Test evidence that deleting account removes user-scoped rows and auth account.

