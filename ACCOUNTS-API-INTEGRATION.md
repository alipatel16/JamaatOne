# JamaatOne Accounts API Integration

The frontend supports both mock and ASP.NET Core API modes.

## Switch modes

```env
EXPO_PUBLIC_USE_MOCK_API=true
EXPO_PUBLIC_API_BASE_URL=http://localhost:5058/api
```

Set `EXPO_PUBLIC_USE_MOCK_API=false` when the backend is ready.

## Payment create/update payload

```json
{
  "userId": "user-guid",
  "paymentFor": "MADRASA_FEE",
  "subType": "MONTHLY_FEE",
  "paidForUserId": "family-member-guid",
  "otherDescription": null,
  "amount": 2500,
  "paymentDate": "2026-08-01",
  "paymentMethod": "CASH",
  "referenceNumber": "",
  "notes": "",
  "recordedByUserId": "logged-in-user-guid",
  "recordedByItsId": "12345678",
  "recordedByName": "Committee Member Name"
}
```

For `paymentFor: "OTHERS"`, send `otherDescription`.

For `paymentFor: "MADRASA_FEE"`, send `paidForUserId`.

## Receipt response additions

```json
{
  "paidForUserId": "family-member-guid",
  "paidForUserName": "Student Name",
  "paidForItsId": "87654321",
  "recordedByUserId": "committee-user-guid",
  "recordedByItsId": "12345678",
  "recordedByName": "Committee Member Name"
}
```

## Axis Bank accounts

The frontend sends one of:

- `AXIS_GENERAL`
- `AXIS_VAJEBAT_AMANAT`
- `AXIS_MADRASA`
- `AXIS_FMB`

The backend should store the account code and resolve the immutable account
number/name from server-side configuration.
