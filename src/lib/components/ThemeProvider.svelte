<script lang="ts">
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/core/stores/ThemeStore.svelte';
	import { browser } from '$app/environment';

	// This component handles theme initialization and
	// prevents the flash of incorrect theme on page load

	let { children } = $props();
	let mounted = $state(false);

	// Get the current theme classes
	let themeClasses = $derived(themeStore.htmlClasses.join(' '));

	// Prevent flash of wrong theme by using a script in the head
	// This needs to run before the page renders
	const themeScript = `
      (function() {
        try {
          const stored = localStorage.getItem('app-state');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.themePreferences) {
              const theme = parsed.themePreferences;
              
              // Apply theme mode
              let appliedTheme = theme.mode;
              if (theme.followSystem) {
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemDark) appliedTheme = 'dark';
              }
              
              if (appliedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              }
              
              // Apply font size
              if (theme.fontSize && theme.fontSize !== 'medium') {
                document.documentElement.classList.add('font-' + theme.fontSize);
              }
              
              // Apply contrast
              if (theme.contrast === 'high') {
                document.documentElement.classList.add('high-contrast');
              }
              
              // Apply color accent
              if (theme.colorAccent && theme.colorAccent !== 'default') {
                document.documentElement.classList.add('accent-' + theme.colorAccent);
              }
              
              // Apply reduced motion
              if (theme.reducedMotion) {
                document.documentElement.classList.add('reduced-motion');
              }
            }
          }
        } catch (e) {
          console.error('Error applying theme:', e);
        }
      })();
    `;

	onMount(() => {
		mounted = true;
	});
</script>

{#if browser && !mounted}
	{@html `<script>` + themeScript + `</script>`}
{/if}

{@render children()}
