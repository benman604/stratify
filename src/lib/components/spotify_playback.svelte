<script lang="ts">
    import { Fa } from 'svelte-fa';
    import { faPause, faForwardStep, faBackwardStep } from '@fortawesome/free-solid-svg-icons';
</script>

<div
	class="flex flex-col gap-2 rounded bg-green-600 px-4 py-3 text-sm font-medium text-white"
>
	<!-- Top row -->
	<div class="flex items-center gap-3">
		<!-- Previous -->
		<button class="cursor-pointer transition hover:text-green-300" disabled>
			<Fa icon={faBackwardStep} class="text-md" />
		</button>

		<!-- Play / Pause -->
		<button
			class="flex h-7 w-7 items-center justify-center rounded-full bg-white text-green-700 transition hover:scale-110 hover:bg-green-100 cursor-pointer"
		>
			<Fa icon={faPause} class="text-md" />
			<!-- swap faPause/faPlay -->
		</button>

		<!-- Next -->
		<button class="cursor-pointer transition hover:text-green-300">
			<Fa icon={faForwardStep} class="text-md" />
		</button>

		<!-- Track info -->
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">
				Midnight City
			</p>

			<p class="truncate text-[10px] text-green-100">
				M83
			</p>
		</div>
	</div>

	<!-- Seek -->
	<div class="flex flex-col gap-1">
		<input
			type="range"
			min="0"
			max="100"
			value="37"
			class="h-1 w-full cursor-pointer appearance-none rounded-full bg-green-300 accent-white"
		/>

		<div class="flex justify-between text-[10px] text-green-100">
			<span>1:37</span>
			<span>4:12</span>
		</div>
	</div>
</div>