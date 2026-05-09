<script lang="ts">
    import Map from '../components/map.svelte';
</script>

<main class="w-full">
    <header class="bg-amber-600 w-full px-4">
        <h1 class="text-3xl text-center text-white py-4">Stratify</h1>
    </header>

    <div class="w-full items-center justify-center flex py-10 px-4">
        <div class="w-full max-w-7xl mx-auto p-4 border-gray-200 border-2">
            <h2 class="text-2xl font-bold mb-4">Sync your playlists to your runs.</h2>
            <p class="text-gray-700">To get started, connect your Spotify and Strava accounts.</p>

            <br>
            <div class="flex flex-col md:flex-row gap-4">
                <a href="/auth/spotify" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition">Connect Spotify</a>
                <a href="/auth/strava" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Connect Strava</a>
            </div>

            <br>
            <Map />
        </div>
    </div>
</main>