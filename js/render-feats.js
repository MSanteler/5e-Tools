class RenderFeats {
	static $getRenderedFeat (feat) {
		const prerequisite = Renderer.utils.getPrerequisiteText(feat.prerequisite);
		Renderer.feat.mergeAbilityIncrease(feat);
		const renderStack = [];
		Renderer.get().setFirstSection(true).recursiveRender({entries: feat.entries}, renderStack, {depth: 2});

		return $$`
			${Renderer.utils.getBorderTr()}
			${Renderer.utils.getNameTr(feat, {page: UrlUtil.PG_FEATS})}
			${prerequisite ? `<tr><td colspan="6"><span class="prerequisite">${prerequisite}</span></td></tr>` : ""}
			<tr><td class="divider" colspan="6"><div></div></td></tr>
			<tr class="text"><td colspan="6">${renderStack.join("")}</td></tr>
			${Renderer.utils.getPageTr(feat)}
			${Renderer.utils.getBorderTr()}
		`;
	}
}
