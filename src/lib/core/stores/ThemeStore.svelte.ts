import { StorageService } from '../services/StorageServices';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type ContrastMode = 'default' | 'high';
export type ColorAccent = 'blue' | 'purple' | 'green' | 'orange' | 'default';

export interface ThemeState {
	mode: ThemeMode;
	fontSize: FontSize;
	contrast: ContrastMode;
	colorAccent: ColorAccent;
	reducedMotion: boolean;
	followSystem: boolean;
}

export class ThemeStore {
	private static instance: ThemeStore;
	private initialized = false;
	private mediaQueryList: MediaQueryList | null = null;

	// Theme state with default values
	themeState = $state<ThemeState>({
		mode: 'light',
		fontSize: 'medium',
		contrast: 'default',
		colorAccent: 'blue',
		reducedMotion: false,
		followSystem: true
	});

	// Current applied theme (derived from state and system preferences)
	appliedTheme = $derived.by(() => {
		if (this.themeState.followSystem && this.systemPrefersDark) {
			return 'dark';
		}
		return this.themeState.mode;
	});

	// System preferences
	systemPrefersDark = $state(false);
	systemPrefersReducedMotion = $state(false);

	// Class names for HTML element
	htmlClasses = $derived.by(() => {
		const classes: string[] = [];

		// Theme mode
		if (this.appliedTheme === 'dark') {
			classes.push('dark');
		}

		// Font size
		if (this.themeState.fontSize !== 'medium') {
			classes.push(`font-${this.themeState.fontSize}`);
		}

		// Contrast
		if (this.themeState.contrast === 'high') {
			classes.push('high-contrast');
		}

		// Color accent
		if (this.themeState.colorAccent !== 'default') {
			classes.push(`accent-${this.themeState.colorAccent}`);
		}

		// Reduced motion
		if (this.themeState.reducedMotion || this.systemPrefersReducedMotion) {
			classes.push('reduced-motion');
		}

		return classes;
	});

	private constructor() {
		// Load initial state from storage
		const storage = StorageService.getInstance();
		const savedState = storage.loadState();

		if (savedState.themePreferences) {
			this.themeState = {
				...this.themeState, // Keep defaults
				...savedState.themePreferences
			};
		}

		// Set up effect for persistence
		$effect.root(() => {
			$effect(() => {
				if (this.initialized) {
					console.log('Saving theme state:', this.themeState);
					StorageService.getInstance().saveState({
						themePreferences: this.themeState
					});
				}
			});

			// Apply theme classes to HTML element
			$effect(() => {
				this.applyThemeToDOM();
			});
		});

		// Initialize system preference detection
		this.initSystemPreferences();
		this.initialized = true;
	}

	static getInstance(): ThemeStore {
		if (!ThemeStore.instance) {
			ThemeStore.instance = new ThemeStore();
		}
		return ThemeStore.instance;
	}

	private initSystemPreferences(): void {
		if (typeof window === 'undefined') return;

		// Check for dark mode preference
		this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemPrefersDark = this.mediaQueryList.matches;

		// Set up listener for changes to color scheme preference
		this.mediaQueryList.addEventListener('change', (e) => {
			this.systemPrefersDark = e.matches;
		});

		// Check for reduced motion preference
		const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		this.systemPrefersReducedMotion = reducedMotionQuery.matches;

		// Set up listener for changes to reduced motion preference
		reducedMotionQuery.addEventListener('change', (e) => {
			this.systemPrefersReducedMotion = e.matches;
		});
	}

	private applyThemeToDOM(): void {
		if (typeof document === 'undefined') return;

		const html = document.documentElement;

		// Clear existing theme classes
		html.classList.remove(
			'dark',
			'font-small',
			'font-large',
			'high-contrast',
			'accent-blue',
			'accent-purple',
			'accent-green',
			'accent-orange',
			'reduced-motion'
		);

		// Add current theme classes
		this.htmlClasses.forEach((className) => {
			html.classList.add(className);
		});

		// Update meta theme-color for mobile browsers
		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute('content', this.appliedTheme === 'dark' ? '#171717' : '#ffffff');
		}
	}

	// Public methods to update theme

	setThemeMode(mode: ThemeMode): void {
		this.themeState = {
			...this.themeState,
			mode,
			followSystem: mode === 'system'
		};
	}

	toggleDarkMode(): void {
		const newMode = this.themeState.mode === 'dark' ? 'light' : 'dark';
		this.setThemeMode(newMode);
	}

	setFontSize(size: FontSize): void {
		this.themeState = {
			...this.themeState,
			fontSize: size
		};
	}

	setContrast(contrast: ContrastMode): void {
		this.themeState = {
			...this.themeState,
			contrast
		};
	}

	setColorAccent(accent: ColorAccent): void {
		this.themeState = {
			...this.themeState,
			colorAccent: accent
		};
	}

	setReducedMotion(reduced: boolean): void {
		this.themeState = {
			...this.themeState,
			reducedMotion: reduced
		};
	}

	setFollowSystem(follow: boolean): void {
		this.themeState = {
			...this.themeState,
			followSystem: follow,
			// If enabling follow system, set mode to 'system'
			...(follow ? { mode: 'system' as ThemeMode } : {})
		};
	}

	// Reset to defaults
	reset(): void {
		this.themeState = {
			mode: 'light',
			fontSize: 'medium',
			contrast: 'default',
			colorAccent: 'default',
			reducedMotion: false,
			followSystem: true
		};
	}
}

export const themeStore = ThemeStore.getInstance();

// Add to window for debugging
if (typeof window !== 'undefined') {
	window.themeStore = themeStore;
}
