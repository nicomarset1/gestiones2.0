# Firebase setup

## Firestore rules

The project is configured to deploy Firestore rules from `firestore.rules`.

Deploy:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project gestiones-marset-2-0
```

Rules behavior:

- Only authenticated users can read/write their own `workspaces/{email}` document.
- Workspace listing is blocked.
- Deleting workspaces from the client is blocked.
- Unknown collections/documents are blocked by default.
- Anonymous demo mode does not use Firebase.

## Authentication emails

Firebase password recovery emails are configured in Firebase Console, not in the React app.

Open:

```text
Firebase Console > Authentication > Templates > Password reset
```

Recommended values:

- Sender name: `Nexo Management`
- Subject: `Restablece tu contrasena de Nexo Management`
- Public-facing product name: `Nexo Management`

Also review:

```text
Firebase Console > Project settings > General > Public-facing name
```

Set it to:

```text
Nexo Management
```

Custom sender emails are limited in Firebase Auth. To send from a fully branded
address such as `soporte@nexomanagement.com`, configure a custom email domain
in Firebase Authentication or use a backend with Firebase Admin SDK and an email
provider.
