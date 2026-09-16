# Deploying the Property Flow static export

First run:

```bash
npm run build
```

The deployable site is the `dist/` folder. It contains only HTML, CSS, JavaScript, JSON and local images.

## Netlify

Create a new manual site and drag the `dist/` folder into the deploy area. No build command or environment variable is required.

## Cloudflare Pages

Create a Pages project with direct upload and upload the contents of `dist/`. If using a Git repository, use `npm run build` as the build command and `dist` as the output directory.

## Vercel

Create a static project. Use `npm run build` as the build command and `dist` as the output directory. No environment variable is required.

## Existing website

The safe universal approach is to publish this export on a subdomain such as `imoveis.example.com` and add a link from the existing website. Embedding or copying it into an existing platform depends on that platform and is not automatic.

## Important limits

This package is a static catalogue. It does not contain the hosted VOLYNX dashboard, authentication, Supabase, Stripe, CRM credentials, lead storage or automatic data synchronization. Edit the local JSON files and rebuild when content changes.
