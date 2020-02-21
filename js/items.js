"use strict";
let mundaneList;
let magicList;
let subList;

class ItemsPage {
	constructor () {
		this._pageFilter = new PageFilterItems();

		this._sublistCurrencyConversion = null;
		this._sublistCurrencyDisplayMode = null;

		this._$totalWeight = null;
		this._$totalValue = null;
	}

	getListItem (item, itI, isExcluded) {
		if (ExcludeUtil.isExcluded(item.name, "item", item.source)) return null;
		if (item.noDisplay) return null;
		Renderer.item.enhanceItem(item);

		this._pageFilter.mutateAndAddToFilters(item, isExcluded);

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const hash = UrlUtil.autoEncodeHash(item);
		const source = Parser.sourceJsonToAbv(item.source);
		const type = item._typeListText.join(", ");

		if (item._fIsMundane) {
			eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
				<span class="col-3-5 pl-0 bold">${item.name}</span>
				<span class="col-4-5">${type}</span>
				<span class="col-1-5 text-center">${item.value || item.valueMult ? Parser.itemValueToFull(item, true).replace(/ +/g, "\u00A0") : "\u2014"}</span>
				<span class="col-1-5 text-center">${Parser.itemWeightToFull(item, true) || "\u2014"}</span>
				<span class="col-1 text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${BrewUtil.sourceJsonToStyle(item.source)}>${source}</span>
			</a>`;

			const listItem = new ListItem(
				itI,
				eleLi,
				item.name,
				{
					hash,
					source,
					type,
					cost: item.value || 0,
					weight: Parser.weightValueToNumber(item.weight)
				},
				{
					uniqueId: item.uniqueId ? item.uniqueId : itI,
					isExcluded
				}
			);
			eleLi.addEventListener("click", (evt) => mundaneList.doSelect(listItem, evt));
			eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, mundaneList, listItem));
			return {mundane: listItem};
		} else {
			eleLi.innerHTML += `<a href="#${hash}" class="lst--border">
				<span class="col-3-5 pl-0 bold">${item.name}</span>
				<span class="col-4">${type}</span>
				<span class="col-1-5 text-center">${Parser.itemWeightToFull(item, true) || "\u2014"}</span>
				<span class="attunement col-0-6 text-center">${item._attunementCategory !== "No" ? "×" : ""}</span>
				<span class="rarity col-1-4">${item.rarity}</span>
				<span class="source col-1 text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${BrewUtil.sourceJsonToStyle(item.source)}>${source}</span>
			</a>`;

			const listItem = new ListItem(
				itI,
				eleLi,
				item.name,
				{
					source,
					hash,
					type,
					rarity: item.rarity,
					attunement: item._attunementCategory !== "No",
					weight: Parser.weightValueToNumber(item.weight)
				},
				{uniqueId: item.uniqueId ? item.uniqueId : itI}
			);
			eleLi.addEventListener("click", (evt) => magicList.doSelect(listItem, evt));
			eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, magicList, listItem));
			return {magic: listItem};
		}
	}

	handleFilterChange () {
		const f = this._pageFilter.filterBox.getValues();
		function listFilter (li) {
			const it = itemList[li.ix];
			return this._pageFilter.toDisplay(f, it);
		}
		mundaneList.filter(listFilter.bind(this));
		magicList.filter(listFilter.bind(this));
		FilterBox.selectFirstVisible(itemList);
	}

	getSublistItem (item, pinId, addCount) {
		const hash = UrlUtil.autoEncodeHash(item);
		const count = addCount || 1;

		const $dispCount = $(`<span class="text-center col-2 pr-0">${count}</span>`);
		const $ele = $$`<li class="row">
			<a href="#${hash}" class="lst--border">
				<span class="bold col-6 pl-0">${item.name}</span>
				<span class="text-center col-2">${item.weight ? `${item.weight} lb${item.weight > 1 ? "s" : ""}.` : "\u2014"}</span>
				<span class="text-center col-2">${item.value || item.valueMult ? Parser.itemValueToFull(item, true).replace(/ +/g, "\u00A0") : "\u2014"}</span>
				${$dispCount}
			</a>
		</li>`.contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			item.name,
			{
				hash,
				source: Parser.sourceJsonToAbv(item.source),
				weight: Parser.weightValueToNumber(item.weight),
				cost: item.value || 0,
				count
			},
			{
				$elesCount: [$dispCount]
			}
		);
		return listItem;
	}

	doLoadHash (id) {
		Renderer.get().setFirstSection(true);
		const $content = $(`#pagecontent`).empty();
		const item = itemList[id];

		function buildStatsTab () {
			$content.append(RenderItems.$getRenderedItem(item));
		}

		function buildFluffTab (isImageTab) {
			return Renderer.utils.pBuildFluffTab(
				isImageTab,
				$content,
				item,
				(fluffJson) => item.fluff || fluffJson.itemFluff.find(it => it.name === item.name && it.source === item.source),
				`data/fluff-items.json`,
				() => true
			);
		}

		const statTab = Renderer.utils.tabButton(
			"Item",
			() => {},
			buildStatsTab
		);
		const infoTab = Renderer.utils.tabButton(
			"Info",
			() => {},
			buildFluffTab
		);
		const picTab = Renderer.utils.tabButton(
			"Images",
			() => {},
			buildFluffTab.bind(null, true)
		);

		// only display the "Info" tab if there's some fluff info--currently (2018-12-13), no official item has text fluff
		if (item.fluff && item.fluff.entries) Renderer.utils.bindTabButtons(statTab, infoTab, picTab);
		else Renderer.utils.bindTabButtons(statTab, picTab);

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._pageFilter.filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub);
	}

	onSublistChange () {
		this._$totalwWeight = this._$totalWeight || $(`#totalweight`);
		this._$totalValue = this._$totalValue || $(`#totalvalue`);

		let weight = 0;
		let value = 0;

		const availConversions = new Set();
		ListUtil.sublist.items.forEach(it => {
			const item = itemList[it.ix];
			if (item.currencyConversion) availConversions.add(item.currencyConversion);
			const count = it.values.count;
			if (item.weight) weight += Number(item.weight) * count;
			if (item.value) value += item.value * count;
		});

		this._$totalwWeight.text(`${weight.toLocaleString()} lb${weight !== 1 ? "s" : ""}.`);

		if (availConversions.size) {
			this._$totalValue
				.text(Parser.itemValueToFull({value, currencyConversion: this._sublistCurrencyConversion}))
				.off("click")
				.click(async () => {
					const values = ["(Default)", ...[...availConversions].sort(SortUtil.ascSortLower)];
					const defaultSel = values.indexOf(this._sublistCurrencyConversion);
					const userSel = await InputUiUtil.pGetUserEnum({
						values,
						isResolveItem: true,
						default: ~defaultSel ? defaultSel : 0,
						title: "Select Currency Conversion Table",
						fnDisplay: it => it === null ? values[0] : it
					});
					if (userSel == null) return;
					this._sublistCurrencyConversion = userSel === values[0] ? null : userSel;
					await StorageUtil.pSetForPage("sublistCurrencyConversion", this._sublistCurrencyConversion);
					this.onSublistChange();
				});
		} else {
			const modes = ["Exact Coinage", "Lowest Common Currency", "Gold"];
			const text = (() => {
				switch (this._sublistCurrencyDisplayMode) {
					case modes[1]: return Parser.itemValueToFull({value});
					case modes[2]: {
						return value ? `${Parser._DEFAULT_CURRENCY_CONVERSION_TABLE.find(it => it.coin === "gp").mult * value} gp` : "";
					}
					default:
					case modes[0]: {
						const CURRENCIES = ["gp", "sp", "cp"];
						const coins = {cp: value};
						CurrencyUtil.doSimplifyCoins(coins, CURRENCIES);
						return CURRENCIES.filter(it => coins[it]).map(it => `${coins[it]} ${it}`).join(", ");
					}
				}
			})();

			this._$totalValue
				.text(text || "\u2014")
				.off("click")
				.click(async () => {
					const defaultSel = modes.indexOf(this._sublistCurrencyDisplayMode);
					const userSel = await InputUiUtil.pGetUserEnum({
						values: modes,
						isResolveItem: true,
						default: ~defaultSel ? defaultSel : 0,
						title: "Select Display Mode",
						fnDisplay: it => it === null ? modes[0] : it
					});
					if (userSel == null) return;
					this._sublistCurrencyDisplayMode = userSel === modes[0] ? null : userSel;
					await StorageUtil.pSetForPage("sublistCurrencyDisplayMode", this._sublistCurrencyDisplayMode);
					this.onSublistChange();
				});
		}
	}

	async pOnLoad () {
		window.loadHash = this.doLoadHash.bind(this);
		window.loadSubHash = this.pDoLoadSubHash.bind(this);

		[this._sublistCurrencyConversion, this._sublistCurrencyDisplayMode] = await Promise.all([StorageUtil.pGetForPage("sublistCurrencyConversion"), StorageUtil.pGetForPage("sublistCurrencyDisplayMode")]);
		await ExcludeUtil.pInitialise();
		await this._pageFilter.pInitFilterBox({
			$iptSearch: $(`#lst__search`),
			$wrpFormTop: $(`#filter-search-input-group`).title("Hotkey: f"),
			$btnReset: $(`#reset`)
		});

		return pPopulateTablesAndFilters({item: await Renderer.item.pBuildList({isAddGroups: true, isBlacklistVariants: true})});
	}
}

async function pPopulateTablesAndFilters (data) {
	mundaneList = ListUtil.initList({
		listClass: "mundane",
		fnSort: PageFilterItems.sortItems
	});
	magicList = ListUtil.initList({
		listClass: "magic",
		fnSort: PageFilterItems.sortItems
	});
	mundaneList.nextList = magicList;
	magicList.prevList = mundaneList;
	ListUtil.setOptions({primaryLists: [mundaneList, magicList]});

	const $elesMundaneAndMagic = $(`.ele-mundane-and-magic`);
	$(`.side-label--mundane`).click(() => {
		itemsPage._pageFilter.filterBox.setFromValues({Miscellaneous: {Mundane: 1}});
		itemsPage.handleFilterChange();
	});
	$(`.side-label--magic`).click(() => {
		itemsPage._pageFilter.filterBox.setFromValues({Miscellaneous: {Magic: 1}});
		itemsPage.handleFilterChange();
	});
	const $outVisibleResults = $(`.lst__wrp-search-visible`);
	mundaneList.on("updated", () => {
		const $elesMundane = $(`.ele-mundane`);

		// Force-show the mundane list if there are no items on display
		if (magicList.visibleItems.length) $elesMundane.toggle(!!mundaneList.visibleItems.length);
		else $elesMundane.show();
		$elesMundaneAndMagic.toggle(!!(mundaneList.visibleItems.length && magicList.visibleItems.length));

		const current = mundaneList.visibleItems.length + magicList.visibleItems.length;
		const total = mundaneList.items.length + magicList.items.length;
		$outVisibleResults.html(`${current}/${total}`);
	});
	magicList.on("updated", () => {
		const $elesMundane = $(`.ele-mundane`);
		const $elesMagic = $(`.ele-magic`);

		$elesMagic.toggle(!!magicList.visibleItems.length);
		// Force-show the mundane list if there are no items on display
		if (!magicList.visibleItems.length) $elesMundane.show();
		else $elesMundane.toggle(!!mundaneList.visibleItems.length);
		$elesMundaneAndMagic.toggle(!!(mundaneList.visibleItems.length && magicList.visibleItems.length));

		const current = mundaneList.visibleItems.length + magicList.visibleItems.length;
		const total = mundaneList.items.length + magicList.items.length;
		$outVisibleResults.html(`${current}/${total}`);
	});

	// filtering function
	$(itemsPage._pageFilter.filterBox).on(
		FilterBox.EVNT_VALCHANGE,
		itemsPage.handleFilterChange.bind(itemsPage)
	);

	SortUtil.initBtnSortHandlers($("#filtertools-mundane"), mundaneList);
	SortUtil.initBtnSortHandlers($("#filtertools-magic"), magicList);

	subList = ListUtil.initSublist({
		listClass: "subitems",
		fnSort: PageFilterItems.sortItems,
		getSublistRow: itemsPage.getSublistItem.bind(itemsPage),
		onUpdate: itemsPage.onSublistChange.bind(itemsPage)
	});
	SortUtil.initBtnSortHandlers($("#sublistsort"), subList);
	ListUtil.initGenericAddable();

	addItems(data);
	BrewUtil.pAddBrewData()
		.then(handleBrew)
		.then(() => BrewUtil.bind({lists: [mundaneList, magicList]}))
		.then(() => BrewUtil.pAddLocalBrewData())
		.then(async () => {
			BrewUtil.makeBrewButton("manage-brew");
			BrewUtil.bind({lists: [mundaneList, magicList], filterBox: itemsPage._pageFilter.filterBox, sourceFilter: itemsPage._pageFilter.sourceFilter});
			await ListUtil.pLoadState();
			RollerUtil.addListRollButton();
			ListUtil.addListShowHide();

			ListUtil.bindShowTableButton(
				"btn-show-table",
				"Items",
				itemList,
				{
					name: {name: "Name", transform: true},
					source: {name: "Source", transform: (it) => `<span class="${Parser.sourceJsonToColor(it)}" title="${Parser.sourceJsonToFull(it)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${Parser.sourceJsonToAbv(it)}</span>`},
					rarity: {name: "Rarity", transform: true},
					_type: {name: "Type", transform: it => it._typeHtml},
					_attunement: {name: "Attunement", transform: it => it._attunement ? it._attunement.slice(1, it._attunement.length - 1) : ""},
					_properties: {name: "Properties", transform: it => Renderer.item.getDamageAndPropertiesText(it).filter(Boolean).join(", ")},
					_weight: {name: "Weight", transform: it => Parser.itemWeightToFull(it)},
					_value: {name: "Value", transform: it => Parser.itemValueToFull(it)},
					_entries: {name: "Text", transform: (it) => Renderer.item.getRenderedEntries(it, true), flex: 3}
				},
				{generator: ListUtil.basicFilterGenerator},
				(a, b) => SortUtil.ascSort(a.name, b.name) || SortUtil.ascSort(a.source, b.source)
			);

			mundaneList.init();
			magicList.init();
			subList.init();

			Hist.init(true);
			ExcludeUtil.checkShowAllExcluded(itemList, $(`#pagecontent`));

			window.dispatchEvent(new Event("toolsLoaded"));
		});
}

async function handleBrew (homebrew) {
	const itemList = await Renderer.item.getItemsFromHomebrew(homebrew);
	addItems({item: itemList});
}

let itemList = [];
let itI = 0;
function addItems (data) {
	if (!data.item || !data.item.length) return;

	itemList.push(...data.item);

	for (; itI < itemList.length; itI++) {
		const item = itemList[itI];
		const listItem = itemsPage.getListItem(item, itI);
		if (!listItem) continue;
		if (listItem.mundane) mundaneList.addItem(listItem.mundane);
		if (listItem.magic) magicList.addItem(listItem.magic);
	}

	// populate table labels
	$(`h3.ele-mundane span.side-label`).text("Mundane");
	$(`h3.ele-magic span.side-label`).text("Magic");

	mundaneList.update();
	magicList.update();

	itemsPage._pageFilter.filterBox.render();
	itemsPage.handleFilterChange();

	ListUtil.setOptions({
		itemList: itemList,
		getSublistRow: itemsPage.getSublistItem.bind(itemsPage),
		primaryLists: [mundaneList, magicList]
	});
	ListUtil.bindAddButton();
	ListUtil.bindSubtractButton();
	Renderer.hover.bindPopoutButton(itemList);
	UrlUtil.bindLinkExportButton(itemsPage._pageFilter.filterBox);
	ListUtil.bindDownloadButton();
	ListUtil.bindUploadButton();
}

const itemsPage = new ItemsPage();
window.addEventListener("load", () => itemsPage.pOnLoad());
