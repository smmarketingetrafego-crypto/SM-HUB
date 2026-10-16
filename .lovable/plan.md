# SM Hub — make it real

## 1. Separate data per account
- Every new account gets its own workspace (own clients, projects, finances, proposals). Today everything sits in one shared box.
- Team members invited by an account see only that account's data.
- Founder account (smmarketingetrafego@gmail.com) is given the "Founder (lifetime)" role automatically. It can open any account, see every plan, and change any setting.

## 2. Remove test data
- Delete every sample client, proposal, project, transaction, task, agent and message.
- Remove fake integrations: the made-up WhatsApp QR/pairing code and the "connected" switches that connect to nothing.
- New accounts start empty, with guidance on what to add first.

## 3. Real payments with Asaas
- Plans (name, price, billing cycle) managed by you in the admin panel.
- Subscribing creates a real Asaas customer and charge (Pix, boleto, card). Proposals can generate a real Pix charge too.
- Asaas confirms payment automatically: the plan turns on, or the proposal is approved and recorded in Finance.
- You will need: your Asaas API key, and a webhook token pasted into Asaas (I will open secure forms for both).

## 4. Files on your central Google Drive
- One Google Drive account (yours) connected to the system.
- A separate folder is created automatically for each account. Uploads from that account go only to its folder.
- The founder can browse every account's folder.

## 5. Founder admin panel
- List of all accounts: owner, email, plan, status, created date, last payment.
- Actions: change plan, give free time, suspend/reactivate, open the account as founder.
- List of all subscriptions and payments.

## 6. Support center
- New "Support" page for clients, team members, agencies and freelancers.
- The AI answers first right away. If that doesn't solve it, the person clicks "Talk to a human".
- Founder support inbox: see every ticket, reply, change status (open, in progress, solved). The person sees your reply on their Support page.

## 7. Prepare other integrations
- WhatsApp (official Meta API), email sending (Resend), and AI providers show honest "Not connected" screens with a real connect step. No fake success.

## Order of work
1 → 2 → 5 → 6 → 3 → 4 → 7. Payments and Drive wait only for your Asaas key and Google connection.

## Technical details
- Tables: accounts, account_members, user_roles (founder/admin/member, has_role security definer), plans, subscriptions, payments, support_tickets, support_messages, account_drive_folders. RLS on all; founder bypass via has_role.
- workspace_data keyed by account_id instead of a fixed row; db-drive.ts resolves the caller's account from the bearer token.
- Signup trigger creates an account + owner membership; founder email gets the founder role.
- Asaas via secret ASAAS_API_KEY server-side; webhook /api/public/webhook/payment verifies the asaas-access-token.
- Google Drive via the google_drive App connector (builder-owned central Drive), folder per account.
- AI support replies via Lovable AI Gateway.
