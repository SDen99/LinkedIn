<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	import Navigation from '$lib/components/layout/Navigation.svelte';
	import MainLayout from '$lib/components/layout//MainLayout.svelte';
	import VariableList from '$lib/components/VariableList.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import DataAnalysis from '$lib/components/data/DataAnalysis.svelte';

	import { FileImportManager } from '$lib/core/services/FileImportManager';
	import { initManager } from '$lib/core/services/InitializationService.svelte';
	import { datasetStore } from '$lib/core/stores/datasetStore.svelte';
	import { uiStore } from '$lib/core/stores/UIStore.svelte';
	import { errorStore, ErrorSeverity } from '$lib/core/stores/errorStore';

	import * as Tabs from '$lib/components/core/tabs/index.js';
	import MultiColumnSort from '$lib/components/MultiColumnSort.svelte';
	import DataXmlList from '$lib/components/data/DataXmlList.svelte';
	import DatasetViewTabs from '$lib/components/data/DatasetViewTabs.svelte';

	let FileManager = $state<FileImportManager | null>(null);
	let isLoading = $derived(
		datasetStore.isLoading || Object.keys(datasetStore.loadingDatasets).length > 0
	);
	let initializationError = $state<Error | null>(null);
	let hasDatasets = $derived(datasetStore.availableDatasets.length > 0);

	async function handleFileChangeEvent(event: Event) {
		if (!FileManager) {
			errorStore.addError({
				message: 'Please wait for application services to initialize',
				severity: ErrorSeverity.WARNING
			});
			return;
		}
		{
			const dm = FileManager;
			const files = (event.target as HTMLInputElement).files;
			if (!files?.length) return;

			const validFiles = Array.from(files).filter((file) => {
				const validation = dm.validateFile(file);
				if (!validation.valid && validation.error) {
					errorStore.addError({
						message: validation.error,
						severity: ErrorSeverity.WARNING
					});
				}
				return validation.valid;
			});

			if (!validFiles.length) return;

			datasetStore.setLoadingState(true);

			try {
				const results = await Promise.allSettled(validFiles.map((file) => dm.processFile(file)));

				const failures = results.filter((r) => r.status === 'fulfilled' && !r.value.success);

				if (failures.length > 0) {
					errorStore.addError({
						message: `Failed to process ${failures.length} file(s)`,
						severity: ErrorSeverity.WARNING,
						context: { failures }
					});
				}
			} finally {
				datasetStore.setLoadingState(false);
			}
		}
	}

	async function initializeApp() {
		try {
			console.log('Starting initialization...');
			await initManager.initialize();
			const container = initManager.status.container;

			if (!container) {
				console.error('Container is null after initialization');
				throw new Error('Failed to initialize application container');
			}

			console.log('Creating FileImportManager with container');
			FileManager = new FileImportManager(container);
			console.log('FileImportManager created successfully');
		} catch (error) {
			console.error('Detailed initialization error:', error);
			if (error instanceof Error) {
				console.error('Stack trace:', error.stack);
			}
			initializationError = error instanceof Error ? error : new Error(String(error));
			errorStore.addError({
				message: 'Failed to initialize application',
				severity: ErrorSeverity.ERROR,
				context: { error: initializationError }
			});
		}
	}

	onMount(() => {
		if (browser) {
			initializeApp();
		}
	});

	let selectedDataset = $derived.by(() => {
		if (!datasetStore.selectedDatasetId) return null;
		const dataset = datasetStore.datasets[datasetStore.selectedDatasetId];
		return dataset;
	});

	let datasetDetails = $derived.by(() => {
		if (!selectedDataset?.data || !selectedDataset?.details?.columns) return null;
		return {
			columns: selectedDataset.details.columns,
			dtypes: selectedDataset.details.dtypes || {}
		};
	});

	let hasDefineXml = $derived.by(() => {
		return uiStore.uiState.SDTM || uiStore.uiState.ADaM;
	});

	let defineXmlFiles = $derived(datasetStore.defineXmlDatasets);

	async function loadSampleFile() {
		if (!FileManager) {
			errorStore.addError({
				message: 'Please wait for application services to initialize',
				severity: ErrorSeverity.WARNING
			});
			return;
		}

		datasetStore.setLoadingState(true);

		try {
			// Fetch the sample file from the static directory
			const response = await fetch('/defineV21-ADaM.xml');
			if (!response.ok) {
				throw new Error(`Failed to fetch sample file: ${response.statusText}`);
			}

			const fileBlob = await response.blob();
			const file = new File([fileBlob], 'defineV21-ADaM.xml', { type: 'application/xml' });

			// Validate the file
			const validation = FileManager.validateFile(file);
			if (!validation.valid) {
				throw new Error(validation.error || 'Invalid sample file');
			}

			// Process the file
			const result = await FileManager.processFile(file);

			if (!result.success) {
				throw new Error('Failed to process sample file');
			}

			console.log('Sample file loaded successfully');
		} catch (error) {
			console.error('Error loading sample file:', error);
			errorStore.addError({
				message: `Failed to load sample file: ${error instanceof Error ? error.message : String(error)}`,
				severity: ErrorSeverity.ERROR,
				context: { error }
			});
		} finally {
			datasetStore.setLoadingState(false);
		}
	}

	$effect(() => {
		console.log('hasDefineXml', hasDefineXml);
		console.log('test:', datasetStore.selectedDomain, datasetStore.selectedDatasetId);
	});
</script>

{#if browser}
	{#if initManager.status.status === 'initializing'}
		<div class="flex h-full flex-col items-center justify-center gap-2">
			<p class="text-lg font-medium">Initializing application...</p>
			{#if initManager.status.progress}
				<p class="text-sm text-muted-foreground">
					{initManager.status.progress.message}
				</p>
			{/if}
		</div>
	{:else if initializationError}
		<div class="flex h-full flex-col items-center justify-center gap-4">
			<p class="text-lg font-medium text-destructive">Failed to initialize application</p>
			<p class="text-sm text-muted-foreground">
				{initializationError.message}
			</p>
			<button
				class="btn variant-filled"
				onclick={() => {
					initializationError = null;
					initializeApp();
				}}
			>
				Retry
			</button>
		</div>
	{:else if !hasDatasets}
		<!-- Full Screen Empty State when no datasets are available -->
		<div class="flex h-screen w-full flex-col items-center justify-center bg-background">
			<div class="flex max-w-2xl flex-col items-center px-4 text-center">
				<div class="mb-8 text-primary/80">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="96"
						height="96"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<path d="M14 2v6h6"></path>
						<path d="M9 15h6"></path>
						<path d="M12 12v6"></path>
					</svg>
				</div>

				<h1 class="mb-3 text-3xl font-bold tracking-tight">Define.xml & Data Viewer</h1>
				<p class="mb-10 max-w-md whitespace-nowrap text-xl text-muted-foreground">
					Get started by uploading a Define and begin browsing
				</p>

				<div class="flex flex-col items-center gap-4 sm:flex-row">
					<label
						for="file-upload-empty-state"
						class="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="17 8 12 3 7 8"></polyline>
							<line x1="12" y1="3" x2="12" y2="15"></line>
						</svg>
						Upload Files
					</label>
					<input
						id="file-upload-empty-state"
						type="file"
						multiple
						accept=".sas7bdat,.xml"
						onchange={(e) => handleFileChangeEvent(e)}
						class="hidden"
					/>

					<button
						onclick={() => loadSampleFile()}
						class="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-secondary px-8 py-3 text-base font-medium text-secondary-foreground transition-colors hover:bg-secondary/90"
						disabled={isLoading}
					>
						{#if isLoading}
							<svg
								class="-ml-1 mr-3 h-5 w-5 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
							</svg>
							Loading...
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
								></path>
								<polyline points="14 2 14 8 20 8"></polyline>
							</svg>
							Use CDISC Sample Define.XML
						{/if}
					</button>
				</div>

				<div class="mt-10 text-sm text-muted-foreground">
					<p>Supported file formats: Define.xml, sas7bdat</p>
				</div>
			</div>
		</div>
	{:else if initManager.status.status === 'ready'}
		<!-- Normal application layout when data exists -->
		{#snippet navigation()}
			<Navigation {handleFileChangeEvent} {isLoading} />
		{/snippet}

		{#snippet leftbar()}
			<DataXmlList />
		{/snippet}

		{#snippet mainContent()}
			<div class="h-full">
				{#if datasetStore.selectedDomain}
					<DatasetViewTabs />
				{:else}
					<div class="flex h-full items-center justify-center text-muted-foreground">
						<p>Select a dataset to view</p>
					</div>
				{/if}
			</div>
		{/snippet}

		{#snippet rightbar()}
			<div class="h-full">
				{#if selectedDataset?.data && datasetDetails}
					<Tabs.Root value="columns">
						<Tabs.List>
							<Tabs.Trigger value="columns">Column Order</Tabs.Trigger>
							<Tabs.Trigger value="sort">Sort Order</Tabs.Trigger>
							<Tabs.Trigger value="analysis">Analysis</Tabs.Trigger>
						</Tabs.List>
						<Tabs.Content value="columns">
							<VariableList
								variables={datasetDetails.columns.map((col: string) => ({
									name: col,
									dtype: datasetDetails.dtypes[col] ?? ''
								}))}
							/>
						</Tabs.Content>
						<Tabs.Content value="sort">
							<MultiColumnSort
								variables={datasetDetails.columns.map((col: string) => ({
									name: col
								}))}
							/>
						</Tabs.Content>
						<Tabs.Content value="analysis">
							<DataAnalysis />
						</Tabs.Content>
					</Tabs.Root>
				{/if}
			</div>
		{/snippet}

		{#snippet footer()}
			<Footer />
		{/snippet}

		<MainLayout {navigation} {leftbar} {mainContent} {rightbar} {footer} />
	{/if}
{/if}
