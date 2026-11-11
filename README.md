# react-multi-step-form

Schema-driven multi-step form for React, Material UI, and Vite. It supports RTL and LTR, per-field direction, agreements, live typography, alert dialogs, bottom sheets, a Jalali date wheel, and an in-app camera. Draft values are kept in an encrypted anonymous server session.

```bash
npm install github:lord-aali/react-multi-step-form
```

This library targets **MUI v5** (not v6+). Install peers with pinned majors so npm does not pull the latest MUI 9 line:

```bash
npm install react@^19 react-dom@^19 \
  @mui/material@^5.18.0 @mui/icons-material@^5.17.1 \
  @emotion/react@^11.14.0 @emotion/styled@^11.14.1 @emotion/cache@^11.14.0 \
  stylis@^4.3.6 stylis-plugin-rtl@^2.1.1 \
  notistack@^3.0.2 keen-slider@^6.8.6
```

Do not run `npm install @mui/material @mui/icons-material` without a version — that resolves to MUI 9 and conflicts with this package’s peers. The `prepare` script builds `dist` on install.

## Use a TypeScript schema

`FormSchema` is the interface for a form object.

```tsx
import { MultiStepForm } from "react-multi-step-form"
import type { FormSchema } from "react-multi-step-form"
import "react-multi-step-form/style.css"

const schema: FormSchema = {
  id: "registration",
  table: "registration",
  dir: "rtl",
  validators: [
    { slug: "required", type: "required" },
    { slug: "persian-name", type: "persianName", message: "نام را فارسی بنویسید." },
  ],
  texts: {
    next: "مرحله بعد",
    prev: "بازگشت",
    submit: "ثبت نهایی",
    loading: "لطفا کمی صبر کنید",
    uploading: "در حال آپلود",
  },
  pages: [
    {
      id: "identity",
      title: "اطلاعات فردی",
      description: "نام خود را وارد کنید.",
      items: [
        {
          type: "text",
          name: "firstname",
          label: "نام",
          validators: ["required", "persian-name"],
          errorMessage: "نام را وارد کنید.",
        },
        {
          type: "typography",
          variant: "h2",
          text: "{{firstname}} عزیز",
          visibleWhen: { field: "firstname", op: "notEmpty" },
        },
      ],
    },
  ],
}

export function App() {
  return <MultiStepForm schema={schema} />
}
```

Import `react-multi-step-form/style.css` once. It loads Vazirmatn, Vazirmatn-FD, and the form stylesheet. `MultiStepForm` brings its own theme inside the form, so the host page does not have to match it.

## Load the schema from a URL

```tsx
<MultiStepForm schemaUrl="/forms/sample.json" />
```

The JSON uses the same shape as `FormSchema`. If both `schema` and `schemaUrl` are set, the object is used.

## Direction, texts, and fields

`dir` on the schema is `"rtl"` or `"ltr"`. The default is `"rtl"`. A field can set its own `dir`, including `tel` and `number` text fields. When it is omitted, the form direction is used.

`texts` replaces the default Persian labels: `next`, `prev`, `submit`, `edit`, `loading`, `uploading`, `required`, `invalid`, `confirm`, `cancel`, and the camera and finished-screen strings. See `FormTexts`.

Field `type` values:

| type | What it renders |
| --- | --- |
| `text` | MUI `TextField`. `inputType` is `text`, `tel`, `email`, or `number`. |
| `radio` | `FormControl`, `FormLabel`, `RadioGroup`, `Radio`. |
| `stage` | Horizontal radios. Only the selected option's `items` are mounted. |
| `select` | Read-only `TextField` that opens a bottom sheet. An item may contain nested `items`. |
| `date` | Jalali year, month, and day wheels in a bottom sheet. The stored value is `year/month/day`. |
| `file` | Photo or video tile. `camera` is `advanced` (default) or `native`. |
| `agreement` | MUI `Checkbox`. Optional `terms` can show `static` above the checkbox, or open as an `alert` / `sheet`. |
| `typography` | `h1` through `h6`, `p`, or `span`. `color` falls back to the theme. `{{fieldName}}` is replaced with the live value. |
| rich copy | Page `description`, typography `text`, dialog/agreement `body`, and file camera hints accept plain text, HTML strings, or (TS only) `ReactNode`. |

### Rich text (HTML and ReactNode)

JSON and TypeScript string fields may include HTML such as `<p>`, `<br>`, `<ul>`, `<ol>`, `<li>`, `<b>`, `<strong>`, `<em>`, `<a href="…">`. HTML is sanitized to an allowlist before render. Newlines still work for plain strings (`pre-wrap`).

In a TypeScript schema you can also pass React nodes:

```tsx
{
  type: "typography",
  variant: "p",
  text: (
    <ul>
      <li>First</li>
      <li>Hello {"{{firstname}}"}</li>
    </ul>
  ),
}
```

Note: `{{field}}` interpolation only runs on **string** content. For ReactNode, bind live values yourself from your app or use a string with HTML/`{{field}}`.

`visibleWhen` and a page's `skipWhen` use `eq`, `neq`, `in`, `notIn`, `empty`, `notEmpty`, `gt`, and `lt`. `match` is `"all"` (default) or `"any"`. Conditions read the live form values, so typography and skipped pages update as the user types.

### Validators

Define validators once on the schema, then attach their slugs to fields. A field with no `validators` (or an empty list, or only unknown slugs) is optional. A field with resolved slugs is required and must pass each validator.

```ts
const schema: FormSchema = {
  id: "driver",
  table: "driver",
  validators: [
    { slug: "required", type: "required", message: "الزامی است." },
    { slug: "numeric", type: "numeric", message: "فقط رقم." },
    { slug: "persian-name", type: "persianName", message: "فقط فارسی." },
    { slug: "digit-chars", type: "chars", chars: "0123456789", message: "فقط رقم." },
    { slug: "age", type: "range", min: 18, max: 80, message: "۱۸ تا ۸۰." },
    { slug: "phone-length", type: "length", min: 11, max: 11 },
    { slug: "mobile", type: "pattern", pattern: "^09[0-9]{9}$" },
    { slug: "email", type: "email" },
    { slug: "jalali", type: "jalaliDate" },
  ],
  pages: [
    {
      id: "identity",
      items: [
        {
          type: "text",
          name: "firstname",
          label: "نام",
          validators: ["required", "persian-name"],
          errorMessage: "نام را وارد کنید.",
          errorMessages: { "persian-name": "نام را فارسی بنویسید." },
        },
        {
          type: "text",
          name: "nickname",
          label: "نام مستعار",
          // no validators → optional
        },
      ],
    },
  ],
}
```

| type | Purpose |
| --- | --- |
| `required` | Field must be filled (use alone on radio, select, file, agreement). |
| `numeric` | Digits only. Set `allowDecimal: true` for decimals. |
| `chars` | Every character must appear in `chars` (e.g. `"0123456789"` or Persian letters). |
| `persianName` | Persian letters and spaces. |
| `range` | Numeric value between `min` and/or `max`. |
| `length` | String length between `min` and/or `max`. |
| `pattern` | JavaScript regex in `pattern`. |
| `email` | Email shape. |
| `jalaliDate` | `year/month/day` Jalali text. |

`errorMessage` is the empty/required message. `errorMessages` overrides a slug's message on that field.

There is no simple camera mode. `camera: "advanced"` uses `getUserMedia`, an fps ladder for video, and `MediaRecorder`. `camera: "native"` opens the operating-system camera.

## Dialogs

A page or a field can show an alert or a bottom sheet before navigation, or when a field is activated or toggled.

```ts
dialogs: {
  onActivate: {
    presentation: "alert",
    title: "توجه",
    body: "مدرک باید خوانا باشد.",
    confirmText: "متوجه شدم",
    cancelText: "انصراف",
  },
  onToggle: { presentation: "sheet", title: "تایید", body: "ادامه می‌دهید؟", confirmText: "بله", cancelText: "خیر" },
  beforeNext: { presentation: "sheet", title: "توجه", body: "مرحله بعد مدارک است.", confirmText: "ادامه", cancelText: "بازگشت" },
}
```

`onActivate` runs when a text field is focused or when a select, date, or file field is opened. `onToggle` runs before a radio, stage, or agreement value changes. `beforeNext` and `beforePrev` run after validation. Cancel stays on the current page and does not apply the toggle.

## Customize the style

Every region has a class and a `data-msf-part` attribute. Add a stylesheet after the package CSS.

```css
.msf-page-title { color: #0065dc; }
.msf-field-firstname .MuiOutlinedInput-root { background: #fff8e8; }
.msf-btn-next { border-radius: 12px; }
.msf-file-tile { border-color: #0065dc; }
```

Shell: `msf`, `msf-shell`, `msf-page`, `msf-page-title`, `msf-page-description`, `msf-page-body`, `msf-footer`, `msf-progress`, `msf-btn`, `msf-btn-next`, `msf-btn-prev`, `msf-loading`, `msf-finished`, `msf-finished-title`, `msf-finished-body`.

Fields: `msf-field`, `msf-field-{type}`, `msf-field-{name}`, `msf-label`, `msf-control`, `msf-helper`, `msf-radio-option`, `msf-stage`, `msf-stage-children`, `msf-select`, `msf-select-children`, `msf-date`, `msf-file`, `msf-file-tile`, `msf-file-placeholder`, `msf-file-preview`, `msf-agreement`, `msf-agreement-static`, `msf-agreement-static-title`, `msf-agreement-static-body`, `msf-agreement-check`, `msf-agreement-terms`, `msf-agreement-body`, `msf-typography`.

Overlays: `msf-dialog`, `msf-dialog-title`, `msf-dialog-body`, `msf-dialog-actions`, `msf-sheet`, `msf-sheet-title`, `msf-sheet-body`, `msf-sheet-item`, `msf-camera`, `msf-camera-shutter`, `msf-camera-confirm`, `msf-camera-retake`, `msf-date-picker`, `msf-date-confirm`.

The form root also has `data-page` and `data-field`. To change the palette for the whole form, wrap it in your own `ThemeProvider` only if you fork `createFormTheme`. The component nests its own theme so the 420px column, `#0065dc` primary color, filled inputs, and 25px buttons stay intact unless you override them with the classes above.

## Run the demo

```bash
git clone https://github.com/lord-aali/react-multi-step-form.git
cd react-multi-step-form
npm install
npm run dev
```

Open the site Vite prints. Add `?schema=/forms/sample.json` to load the same sample from JSON instead of the TypeScript object.

## PHP API

The React package does not include the server. Clone the repo and run the PHP app next to MySQL. PHP 8.1, PDO MySQL, and the sodium extension are required.

```bash
php -d extension=sodium -S 127.0.0.1:8080 -t server/public server/public/router.php
```

Enable `extension=sodium` in `php.ini` when you can. Drafts are sealed with `sodium_crypto_secretbox` if that extension is loaded, and with OpenSSL AES-256-GCM otherwise. The key stays in `DRAFT_KEY` on the server.

The Vite dev server proxies `/api` to that process. Edit `server/config/config.php`:

- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_CHARSET`
- `API_KEY` for listing and deleting rows
- `DRAFT_KEY`, 64 hex characters, used only on the server
- `TABLES`

Each table entry has a slug, a physical table name, a public key column (beside the numeric `id`), and columns. Column types are `string`, `text`, `int`, `float`, `bool`, `date`, `datetime`, `json`, and `file`. On boot the server creates a missing database, creates missing tables, and adds missing columns. It does not drop columns.

The sample slug is `registration`. The form's `table` must match a slug. On the first successful step the form inserts a row and keeps the returned key inside the encrypted draft. Later steps update that row. The browser does not store the key.

| Request | Who can call it |
| --- | --- |
| `POST /api/session` | Anyone. Sets an HttpOnly `msf_session` cookie. The database stores only the SHA-256 of the token. |
| `GET /api/session` | The cookie holder. Returns the decrypted draft. |
| `PUT /api/session` | The cookie holder. Replaces the draft. The body is sealed with `sodium_crypto_secretbox` before it is stored. |
| `DELETE /api/session` | The cookie holder. |
| `POST /api/datasets` | Anyone. Body `{ "table", "values" }`. No row key. Returns `{ "id", "key" }`. |
| `PUT /api/datasets/{slug}/{key}` | Anyone who knows the key. |
| `GET /api/datasets/{slug}/{key}` | Anyone who knows the key. No API key. |
| `GET /api/datasets/{slug}` | Requires the `X-Api-Key` header. |
| `DELETE /api/datasets/{slug}/{key}` | Requires `X-Api-Key`. |
| `DELETE /api/datasets/{slug}` | Requires `X-Api-Key`. Body `{ "keys": [] }`. |
| `POST /api/datasets/{slug}/{key}/files/{column}` | Anyone who knows the key. Multipart field name `file`. |
| `GET /api/datasets/{slug}/{key}/files/{column}` | Anyone who knows the key. |

Only columns listed in `TABLES` are written. The public key is 32 random hex characters, so a single row cannot be guessed. Listing and deleting stay behind `API_KEY` so that key cannot be used to dump or wipe a table.

Responses use `{ "status": "ok" | "failed", "message", "data", "errors" }`. `errors` is a map of field name to message and is shown on the matching field.

Files are stored under `server/storage`, outside `server/public`. Change `API_KEY` and `DRAFT_KEY` before any shared deployment.
