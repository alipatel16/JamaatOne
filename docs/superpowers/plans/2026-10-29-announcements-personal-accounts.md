# Announcements, clock selection and personal Accounts

Implemented from the eefa8c7b Swagger and subsequent user corrections.

- Announcement requests contain only `announcement`, with a 4,000-character limit. All six published routes use the authenticated live transport. Dashboard and directory use the paginated list; no client expiry or legacy five-active limit is applied.
- Aamil and Committee_Member manage announcements, following the user's latest correction. FMB_User, FMB_Admin and other roles have read-only access unless they also hold Aamil or Committee_Member.
- Announcements, FMB menus, pauses and request windows use the same ActivityTimeline component as payments, opened through a Timeline button. Request-window configuration/history remains admin-only.
- Request times use browser-native time selection on web and Expo SDK 54's supported native datetime picker (8.4.4) on Android/iOS. Selected wall time is serialized as HH:mm without converting it to UTC.
- Accounts navigation is visible to normal and FMB users. Those without Aamil/Committee access receive only personal payment history and its date/category/subcategory/method/status filters. Exact login ITS resolves muminId; missing or ambiguous matches block history loading. User IDs are never treated as Mumin IDs, and bank configuration is not requested for readers.
- Existing management Accounts is retained separately. Personal history cannot select another payer or create, edit, refund, or delete payments.

Verification: 67 automated tests pass; development web and Android bundles export successfully. Live development announcement reads returned an empty list. Clock opening and shared timeline were checked without saving settings or creating/deleting records. The current preview remains on the user's unsaved request-time selection.
