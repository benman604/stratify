// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
/// <reference types="spotify-web-playback-sdk" />
/// <reference types="leaflet" />

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}


declare module '@fortawesome/pro-solid-svg-icons/index.es' {
  export * from '@fortawesome/pro-solid-svg-icons';
}


export {};
