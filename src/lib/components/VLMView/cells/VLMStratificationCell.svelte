<script lang="ts">
	let { row, column } = $props<{
		row: any;
		column: string;
	}>();
</script>

<div class="text-sm text-foreground">
	{typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column] || '')}
</div>
