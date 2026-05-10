# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.15.3 create --template minimal --types ts --add prettier eslint sveltekit-adapter="adapter:auto" tailwindcss="plugins:none" --install npm stratify
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## OAuth setup

Copy `.env.example` to `.env` and fill in your provider app credentials:

```sh
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
```

For local development, add these redirect URLs to the provider app dashboards:

```txt
http://127.0.0.1:5173/auth/spotify/callback
http://127.0.0.1:5173/auth/strava/callback
```

If Vite starts on another port, add matching callback URLs for that port too.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
