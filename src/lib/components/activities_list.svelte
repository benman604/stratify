<script lang="ts">
    import type { Route } from '$lib/types/strava';
    let { activities = [] }: { activities?: Route[] } = $props();
</script>

<div>
    {#if activities.length === 0}
        <p>No activities found.</p>
    {:else}
        <ul>
            {#each activities as activity}
                <li>{activity.name} - {activity.distance} meters</li>
            {/each}
        </ul>
    {/if}
    <h1>Activities</h1>
</div>