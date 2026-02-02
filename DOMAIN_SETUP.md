# Custom domain setup: dr0p.co → Cloud Run

Use this to point **dr0p.co** (and optionally **www.dr0p.co**) at your Cloud Run service **telescope-app** in **us-central1**.

---

## 1. Verify domain ownership (one-time)

You must prove you own **dr0p.co** before Cloud Run can use it.

**Option A – Google Search Console (recommended)**

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add a property for **dr0p.co**.
3. Verify using one of the options (e.g. DNS TXT record or HTML file) and finish verification.

**Option B – gcloud (opens Search Console)**

```bash
gcloud domains verify dr0p.co
```

Complete the verification in the browser (Search Console).

Check that the domain is verified:

```bash
gcloud domains list-user-verified
```

You should see `dr0p.co` in the list.

---

## 2. Map dr0p.co to your Cloud Run service

```bash
gcloud beta run domain-mappings create \
  --service telescope-app \
  --domain dr0p.co \
  --region us-central1
```

(If the domain is already mapped to another service and you want to move it, add `--force-override`.)

---

## 3. Get the DNS records

```bash
gcloud beta run domain-mappings describe dr0p.co --region us-central1
```

Or only the resource records:

```bash
gcloud beta run domain-mappings describe dr0p.co \
  --region us-central1 \
  --format="yaml(status.resourceRecords)"
```

You’ll get A, AAAA, and/or CNAME records. You need to add these **exactly** at your DNS provider.

---

## 4. Add DNS records at your registrar

Where you manage DNS for **dr0p.co** (e.g. Cloudflare, Namecheap, Google Domains, Route 53):

- For **dr0p.co** (root): use the **Name** / **Host** value as given (often `@` or blank).
- For **www.dr0p.co**: if Cloud Run gave you a record for `www`, add that too; otherwise you can add a CNAME `www` → the target they give you (or the same target as the root, if your provider allows).

Add every **Type**, **Name**, and **Value** from the `resourceRecords` output. Don’t skip A/AAAA if they’re present.

**Examples:**

| Type  | Name | Value (example – use your actual values) |
|-------|------|------------------------------------------|
| A     | @    | 216.239.32.21                            |
| AAAA  | @    | 2001:4860:4802:32::15                    |
| CNAME | www  | ghs.googlehosted.com                     |

- **Cloudflare:** DNS → Add record (turn off “Proxy” for A/AAAA/CNAME used for Cloud Run if you have issues).
- **Namecheap:** Advanced DNS → Add record.
- **Google Domains:** DNS → Custom records.

Wait a few minutes (up to 48 hours in rare cases) for DNS to propagate.

---

## 5. Wait for SSL and test

- Google will issue a managed certificate for **dr0p.co** (often within ~15 minutes, sometimes up to 24 hours).
- Then test:
  - `https://dr0p.co`
  - `https://www.dr0p.co` (if you added a record for `www`)

---

## Quick reference

| Item        | Value          |
|------------|----------------|
| Domain     | dr0p.co        |
| Service    | telescope-app  |
| Region     | us-central1    |
| Console    | [Cloud Run → Domain mappings](https://console.cloud.google.com/run/domains?project=gen-lang-client-0084405201) |

To see mapping status:

```bash
gcloud beta run domain-mappings describe dr0p.co --region us-central1
```
