<script lang="ts">
	import { themeStore } from '$lib/core/stores/ThemeStore.svelte';
	import { Moon, Sun, Monitor } from '@lucide/svelte';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
		DropdownMenuSeparator,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuCheckboxItem,
		DropdownMenuLabel
	} from '$lib/components/core/dropdown-menu';
	import { Button } from '$lib/components/core/button';
	import type { ColorAccent, FontSize } from '$lib/core/stores/ThemeStore.svelte';

	// Derived values from the store
	let mode = $derived(themeStore.themeState.mode);
	let followSystem = $derived(themeStore.themeState.followSystem);
	let fontSize = $derived(themeStore.themeState.fontSize);
	let colorAccent = $derived(themeStore.themeState.colorAccent);
	let contrast = $derived(themeStore.themeState.contrast);
	let reducedMotion = $derived(themeStore.themeState.reducedMotion);

	// Handle theme changes
	function handleModeChange(newMode: string) {
		themeStore.setThemeMode(newMode as 'light' | 'dark' | 'system');
	}

	function handleFontSizeChange(newSize: string) {
		themeStore.setFontSize(newSize as FontSize);
	}

	function handleColorAccentChange(newAccent: string) {
		themeStore.setColorAccent(newAccent as ColorAccent);
	}

	function handleContrastChange(e: Event) {
		const isHighContrast = (e.target as HTMLInputElement).checked;
		themeStore.setContrast(isHighContrast ? 'high' : 'default');
	}

	function handleReducedMotionChange(e: Event) {
		const isReducedMotion = (e.target as HTMLInputElement).checked;
		themeStore.setReducedMotion(isReducedMotion);
	}
</script>

<DropdownMenu>
	<DropdownMenuTrigger asChild>
		<Button variant="outline" size="icon" class="h-9 w-9">
			{#if followSystem}
				<Monitor class="h-[1.2rem] w-[1.2rem]" />
			{:else if mode === 'dark'}
				<Moon class="h-[1.2rem] w-[1.2rem]" />
			{:else}
				<Sun class="h-[1.2rem] w-[1.2rem]" />
			{/if}
			<span class="sr-only">Toggle theme</span>
		</Button>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<DropdownMenuLabel>Theme</DropdownMenuLabel>
		<DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
			<DropdownMenuRadioItem value="light">
				<Sun class="mr-2 h-4 w-4" />
				<span>Light</span>
			</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="dark">
				<Moon class="mr-2 h-4 w-4" />
				<span>Dark</span>
			</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="system">
				<Monitor class="mr-2 h-4 w-4" />
				<span>System</span>
			</DropdownMenuRadioItem>
		</DropdownMenuRadioGroup>

		<DropdownMenuSeparator />
		<DropdownMenuLabel>Typography</DropdownMenuLabel>
		<DropdownMenuRadioGroup value={fontSize} onValueChange={handleFontSizeChange}>
			<DropdownMenuRadioItem value="small">Small</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="large">Large</DropdownMenuRadioItem>
		</DropdownMenuRadioGroup>

		<DropdownMenuSeparator />
		<DropdownMenuLabel>Color</DropdownMenuLabel>
		<DropdownMenuRadioGroup value={colorAccent} onValueChange={handleColorAccentChange}>
			<DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="blue">Blue</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="purple">Purple</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="green">Green</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="orange">Orange</DropdownMenuRadioItem>
		</DropdownMenuRadioGroup>

		<DropdownMenuSeparator />
		<DropdownMenuLabel>Accessibility</DropdownMenuLabel>
		<DropdownMenuCheckboxItem checked={contrast === 'high'} onCheckedChange={handleContrastChange}>
			High contrast
		</DropdownMenuCheckboxItem>
		<DropdownMenuCheckboxItem checked={reducedMotion} onCheckedChange={handleReducedMotionChange}>
			Reduced motion
		</DropdownMenuCheckboxItem>
	</DropdownMenuContent>
</DropdownMenu>
