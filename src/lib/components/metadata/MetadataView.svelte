<script lang="ts">
	import type {
		ParsedDefineXML,
		ItemRef,
		ItemDef,
		ValueListDef,
		ItemGroup
	} from '$lib/types/define-xml'; // Added ItemGroup
	import { normalizeDatasetId } from '$lib/core/utils/datasetUtils';
	import { Search, Table as TableIcon, LayoutList } from '@lucide/svelte';
	import { Input } from '$lib/components/core/input';
	import { Button } from '$lib/components/core/button';
	import MetadataTable from './table/MetadataTable.svelte';
	import MetadataCard from './card/MetadataCard.svelte';
	import { metadataViewStore } from '$lib/core/stores/MetadataViewStore.svelte';
	import { uiStore } from '$lib/core/stores/UIStore.svelte';
	import { ChevronDown, ChevronRight } from '@lucide/svelte';
	import {
		getAllExpansionKeys,
		isMethodExpanded,
		isCodelistExpanded,
		isAnyExpansionActive // Added import
	} from './shared/expansionUtils';
	import { hasCodelist, getCodeList } from './shared/codelistUtils'; // Added getCodeList

	let { define, defineType, datasetName } = $props<{
		define: ParsedDefineXML | null;
		defineType: 'SDTM' | 'ADaM' | null;
		datasetName: string;
	}>();

	let methods = $derived(define?.Methods || []);
	let comments = $derived(define?.Comments || []);
	let codeLists = $derived(define?.CodeLists || []);
	let rawState = $derived(metadataViewStore.getDatasetState(datasetName));
	let isTableView = $derived(uiStore.uiState.metadataViewMode === 'table');

	// --- CHANGED SECTION: datasetMetadata derived state ---
	let datasetMetadata = $derived(() => {
		if (!define || !define.ItemGroups) {
			console.log('MetadataView: define or ItemGroups missing');
			return null;
		}
		const normalizedName = normalizeDatasetId(datasetName);
		console.log(`MetadataView: Looking for ItemGroup with normalized name: '${normalizedName}'`);
		const foundGroup = define.ItemGroups.find((g: ItemGroup) => {
			const currentGroupNormalized = normalizeDatasetId(g.SASDatasetName || g.Name || '');
			console.log(`  Checking group: ${g.OID}, Normalized: '${currentGroupNormalized}'`); // Optional detailed log
			return currentGroupNormalized === normalizedName;
		});
		console.log(
			`MetadataView: Found group for '${normalizedName}':`,
			foundGroup ? foundGroup.OID : 'null'
		);
		return foundGroup;
	});
	// --- END OF CHANGED SECTION ---

	function isItemRef(obj: any): obj is ItemRef {
		// OID is the ItemDef OID in ItemRef, Mandatory/OrderNumber are attributes of ItemRef itself
		return obj && 'OID' in obj && 'Mandatory' in obj && 'OrderNumber' in obj;
	}

	// --- CHANGED SECTION: getBaseVariables function ---
	function getBaseVariables(): (ItemRef & { itemDef?: ItemDef | null; hasVLM: boolean })[] {
		const funcName = `[${datasetName} - getBaseVariables]`; // Prefix for logs
		console.log(`${funcName} Starting function execution.`);

		const itemGroup = datasetMetadata(); // Use the derived ItemGroup

		if (!define) {
			console.warn(`${funcName} 'define' object is null or undefined.`);
			return [];
		}
		if (!itemGroup) {
			console.warn(`${funcName} No ItemGroup found for dataset.`);
			return [];
		}
		if (!itemGroup.ItemRefs || itemGroup.ItemRefs.length === 0) {
			// Check for itemGroup and its ItemRefs
			console.warn(`${funcName} Found ItemGroup (${itemGroup.OID}), but it has no ItemRefs.`);
			return [];
		}
		console.log(
			`${funcName} Found ItemGroup: ${itemGroup.OID} with ${itemGroup.ItemRefs.length} ItemRefs.`
		);

		// Create a map of ItemDefs for efficient lookup
		if (!define.ItemDefs || define.ItemDefs.length === 0) {
			console.error(
				`${funcName} define.ItemDefs is missing or empty! Cannot look up variable details.`
			);
			return [];
		}
		const itemDefsMap = new Map(define.ItemDefs.map((def: ItemDef) => [def.OID, def]));
		console.log(`${funcName} Created itemDefsMap with ${itemDefsMap.size} entries.`);
		// Optional: Log a few keys to check format
		// const sampleKeys = Array.from(itemDefsMap.keys()).slice(0, 5);
		// console.log(`${funcName} Sample ItemDef keys:`, sampleKeys);

		// Determine VLM variables based on ValueListDefs
		const valueListDefs = define.ValueListDefs || [];
		const vlmVars = new Set(
			valueListDefs
				.map((vld: ValueListDef) => {
					const nameToUse = itemGroup.Name || datasetName; // Prefer ItemGroup Name if available
					const splitKey = `VL.${nameToUse}.`;
					const variablePart = vld.OID?.split(splitKey)[1];
					// console.log(`${funcName} VLM check: OID=${vld.OID}, splitKey=${splitKey}, variablePart=${variablePart}`); // Detailed VLM log
					return variablePart;
				})
				.filter(Boolean) // Filter out undefined/null results from split
		);
		console.log(`${funcName} Found ${vlmVars.size} VLM variables:`, Array.from(vlmVars));

		// Map the ItemRefs from the specific ItemGroup
		console.log(`${funcName} Mapping ${itemGroup.ItemRefs.length} ItemRefs...`);
		const mappedVariables = itemGroup.ItemRefs.map((ref: ItemRef, index: number) => {
			const refLogPrefix = `${funcName} Ref #${index} (Target OID: ${ref.OID}):`;
			console.log(`${refLogPrefix} Processing ItemRef.`);

			if (!ref.OID) {
				console.warn(`${refLogPrefix} ItemRef is missing target OID. Skipping.`);
				return null;
			}

			const itemDef = itemDefsMap.get(ref.OID); // Look up ItemDef using ItemRef.OID (which points to ItemDef OID)

			if (!itemDef) {
				console.warn(`${refLogPrefix} ItemDef lookup FAILED.`);
				return null; // Skip if ItemDef is missing
			}
			console.log(`${refLogPrefix} ItemDef FOUND: ${itemDef.Name} (OID: ${itemDef.OID})`);

			// Get variable name from ItemDef
			const varName = itemDef.Name;
			if (!varName) {
				console.warn(`${refLogPrefix} ItemDef found, but Name is missing. OID: ${itemDef.OID}`);
				// Decide if you want to skip or use a fallback like OID parsing
				// return null; // Option: Skip if name is crucial
			}

			const hasVLM = varName ? vlmVars.has(varName) : false; // Check if it has VLM based on Name
			console.log(`${refLogPrefix} Variable Name: '${varName}', Has VLM: ${hasVLM}`);

			return {
				...ref, // Spread ItemRef properties (OrderNumber, Mandatory, MethodOID, etc.)
				itemDef: itemDef, // Assign the found ItemDef
				hasVLM: hasVLM
			};
		});

		console.log(
			`${funcName} Mapped variables BEFORE filtering (${mappedVariables.length} items):`,
			mappedVariables
		);

		const filteredVariables = mappedVariables.filter(
			(variable): variable is ItemRef & { itemDef: ItemDef; hasVLM: boolean } => {
				const isValid = variable !== null && variable.itemDef !== null;
				// if (!isValid && variable !== null) { // Log only when itemDef is the issue
				//     console.warn(`${funcName} Filtering out variable because itemDef is null. Original Ref OID: ${variable?.OID}`);
				// } else if (variable === null) {
				//     // This case was likely logged during mapping already
				// }
				return isValid;
			}
		);

		console.log(
			`${funcName} Mapped variables AFTER filtering (${filteredVariables.length} items):`,
			filteredVariables
		);

		if (itemGroup.ItemRefs.length > 0 && filteredVariables.length === 0) {
			console.error(
				`${funcName} CRITICAL: All ${itemGroup.ItemRefs.length} ItemRefs were filtered out. This likely means NO corresponding ItemDefs were found in the main list!`
			);
			// Log OIDs that were attempted but failed lookup
			const failedOIDs = itemGroup.ItemRefs.map((ref) => ref.OID).filter(
				(oid) => oid && !itemDefsMap.has(oid)
			);
			console.error(`${funcName} OIDs from ItemRefs NOT found in ItemDefs map:`, failedOIDs);
		}

		const sortedVariables = filteredVariables.sort((a, b) => {
			// Sort by OrderNumber found on the ItemRef
			return parseInt(a.OrderNumber || '0') - parseInt(b.OrderNumber || '0');
		});

		console.log(`${funcName} Final sorted variables count: ${sortedVariables.length}`);
		return sortedVariables;
	}
	// --- END OF CHANGED SECTION ---

	function getFilteredVariables() {
		const baseVars = getBaseVariables();
		if (!baseVars?.length) return [];

		const searchLower = rawState.searchTerm.toLowerCase();
		if (!searchLower) return baseVars;

		return baseVars.filter((variable: any) => {
			// Search in ItemDef's Name and Description
			const name = variable.itemDef?.Name?.toLowerCase() || '';
			const description = variable.itemDef?.Description?.toLowerCase() || '';
			return name.includes(searchLower) || description.includes(searchLower);
		});
	}

	function areAllExpanded() {
		const filteredVars = getFilteredVariables();
		if (filteredVars.length === 0) return false;

		return filteredVars.every((variable) => {
			// Pass the ItemRef itself (which now includes itemDef)
			const needsMethodExpansion = variable.MethodOID
				? isMethodExpanded(variable, datasetName) // isMethodExpanded expects ItemRef
				: true;

			const needsCodelistExpansion = hasCodelist(variable, codeLists) // hasCodelist expects ItemRef with itemDef
				? isCodelistExpanded(variable, datasetName) // isCodelistExpanded expects ItemRef
				: true;

			return needsMethodExpansion && needsCodelistExpansion;
		});
	}

	function toggleAll() {
		const filteredVars = getFilteredVariables();

		if (areAllExpanded()) {
			metadataViewStore.collapseAll(datasetName);
		} else {
			// Pass the ItemRef array to getAllExpansionKeys
			const expansionKeys = getAllExpansionKeys(filteredVars, datasetName, codeLists);
			metadataViewStore.expandAll(datasetName, expansionKeys);
		}
	}

	function toggleView() {
		uiStore.setMetadataViewMode(isTableView ? 'card' : 'table');
	}

	function updateSearch(term: string) {
		metadataViewStore.updateSearch(datasetName, term);
	}

	// --- ADDED: Handle variable expansion for table/card views ---
	function handleExpandToggle(variable: ItemRef) {
		// Expects ItemRef
		if (variable.MethodOID) {
			toggleExpansion(variable, datasetName, EXPANSION_TYPE.METHOD);
		}
		// Pass the variable (which includes itemDef) to hasCodelist
		if (hasCodelist(variable, codeLists)) {
			toggleExpansion(variable, datasetName, EXPANSION_TYPE.CODELIST);
		}
	}

	// Helper for checking expansion state for chevron
	function isExpanded(variable: ItemRef): boolean {
		// Expects ItemRef
		return isAnyExpansionActive(variable, datasetName);
	}
	// --- END OF ADDED SECTION ---
</script>

<!-- Content section -->
<div class="flex h-[calc(100vh-16rem)] flex-col">
	<!-- Controls section -->
	<div class="flex-none p-4">
		<div class="flex items-center justify-between">
			<div class="relative w-64">
				<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search variables..."
					class="pl-8"
					value={rawState.searchTerm}
					oninput={(e: Event) => {
						const target = e.target as HTMLInputElement;
						updateSearch(target.value);
					}}
				/>
			</div>

			<!-- Add expand/collapse all button -->
			<div class="flex items-center gap-4">
				<Button variant="outline" size="sm" class="gap-2" onclick={toggleAll}>
					{#if areAllExpanded()}
						<ChevronDown class="h-4 w-4" />
						<span>Collapse All</span>
					{:else}
						<ChevronRight class="h-4 w-4" />
						<span>Expand All</span>
					{/if}
				</Button>
			</div>

			<div class="flex gap-2">
				<Button variant="default" size="icon" onclick={toggleView} aria-label="Toggle view">
					{#if isTableView}
						<LayoutList class="h-4 w-4" />
					{:else}
						<TableIcon class="h-4 w-4" />
					{/if}
				</Button>
			</div>
		</div>
	</div>

	{#if define}
		{@const variablesToDisplay = getFilteredVariables()}
		<!-- Calculate once -->
		{#if variablesToDisplay.length > 0}
			{#if isTableView}
				<MetadataTable
					{define}
					{datasetName}
					filteredVariables={variablesToDisplay}
					{methods}
					{comments}
					{codeLists}
				/>
			{:else}
				<MetadataCard
					{define}
					{datasetName}
					filteredVariables={variablesToDisplay}
					{methods}
					{comments}
					{codeLists}
				/>
			{/if}
		{:else}
			<div class="flex h-[200px] items-center justify-center text-muted-foreground">
				<p>
					No variables found{rawState.searchTerm ? ' matching search criteria' : ''} for this dataset.
				</p>
			</div>
		{/if}
	{:else}
		<div class="flex h-[200px] items-center justify-center text-muted-foreground">
			<p>No metadata available for this dataset</p>
		</div>
	{/if}
</div>
