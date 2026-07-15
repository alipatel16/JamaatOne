# JamaatOne

Expo React Native JavaScript frontend for Android, iOS, and web.

## Mock mode

The included `.env` contains:

```env
EXPO_PUBLIC_USE_MOCK_API=true
```

Any password works:

- `12345678` — Admin
- `22345678` — Normal user
- `32345678` — Committee member

## V4 frontend flow

### Namaaz

The Namaaz screen displays these backend-provided values exactly:

- Sihori End
- Sunrise
- Zawal
- Zuhr End
- Asr End
- Maghrib
- Nisf Ul Layl Start
- Nisf Ul Layl End

```text
GET /prayer-times?latitude={latitude}&longitude={longitude}&date={YYYY-MM-DD}
```

### Calendar

```text
GET /calendar?year={year}&month={month}
GET /calendar/day?date={YYYY-MM-DD}
```

The month response supplies the Gregorian grid, Bohra/Misri Hijri month,
Hijri day, event markers, and month navigation data. The selected-day API
supplies announcements and prayer summary.

### Users

The main user list is searchable and read-only.

```text
GET /admin/users
GET /admin/users/{userId}
PUT /admin/users/{userId}
```

All editing happens in the user detail screen.

### Family linking

No standalone household creation screen is used. Family members are linked
from a selected user's detail screen.

```text
GET    /admin/users/{userId}/family-members
GET    /admin/users/{userId}/family-candidates?search={text}
POST   /admin/users/{userId}/family-members
PATCH  /admin/users/{userId}/family-members/{memberUserId}
DELETE /admin/users/{userId}/family-members/{memberUserId}
```

POST body:

```json
{
  "memberUserId": "user-guid",
  "relationToHof": "SON"
}
```

The backend should ensure one HOF per linked family and maintain family
integrity when the HOF or relation changes.

### Announcements

Admin and committee members can manage up to five active dashboard
announcements.

```text
GET    /announcements
POST   /announcements
PUT    /announcements/{announcementId}
DELETE /announcements/{announcementId}
```

The backend must enforce a maximum of five active announcements per Jamaat.

### FMB enrollment

FMB enrollment is edited from user details:

```text
PATCH /admin/users/{userId}/fmb
```

Normal users can pause and resume their own enrolled thali using the existing
FMB endpoints.

## Run

```bash
npm install
npx expo start --offline --clear --port 8082
```


## Responsive calendar and namaaz screens

The Namaaz and Calendar tabs now use responsive React Native layouts rather
than image-like replicas.

- Mobile: stacked cards, compact calendar cells, touch-friendly navigation
- Web/tablet: wider panels, side-by-side detail views, monthly tables
- All values remain data-driven through the API client and mock layer
- Namaaz month view uses `/prayer-times/month`
