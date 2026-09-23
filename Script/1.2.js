// ==UserScript==
// @name         Set Portainer Items per Page to All
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically set Items per page to 'All' in Portainer and Portainer CE
// @author       CASKexe
// @match        *://192.168.0.__:9443/*
// @match        *://192.168.0.__:9443/*
// @license      MIT
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzNiA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMzUuNDkyMiAxNS45MjQ2QzM1LjM5MjIgMTUuODM5OCAzNC40OTQ1IDE1LjE0MzUgMzIuNTY2NiAxNS4xNDM1QzMyLjA2ODEgMTUuMTQzNSAzMS41NTI2IDE1LjE5NDIgMzEuMDU0MiAxNS4yNzk4QzMwLjY4ODMgMTIuNjgwOCAyOC41Nzc0IDExLjQyMzYgMjguNDk0NSAxMS4zNTYzTDI3Ljk3OSAxMS4wNTA1TDI3LjY0NjQgMTEuNTQzMkMyNy4yMzA5IDEyLjIwNTUgMjYuOTE1NCAxMi45NTMzIDI2LjczMjUgMTMuNzE3N0MyNi4zODM2IDE1LjE5NTggMjYuNTk5MSAxNi41ODg0IDI3LjMzMDkgMTcuNzc3NEMyNi40NDk1IDE4LjI4NjcgMjUuMDIwMSAxOC40MDU1IDI0LjcyMDggMTguNDIzSDEuMTE2MTRDMC41MDE0MDggMTguNDIzIDAuMDAyMTgxODggMTguOTMyMyAwLjAwMjE4MTg4IDE5LjU2MTNDLTAuMDMxMTUxNSAyMS42Njc2IDAuMzE3Njg2IDIzLjc3MzkgMS4wMzI0MiAyNS43NjEzQzEuODQ3MTUgMjcuOTM1OCAzLjA2MDMzIDI5LjU0OTQgNC42MjMxMiAzMC41MzQ4QzYuMzg1MTQgMzEuNjM5IDkuMjYxMTIgMzIuMjY3MiAxMi41MDIyIDMyLjI2NzJDMTMuOTY1IDMyLjI2NzIgMTUuNDI3OCAzMi4xMzA5IDE2Ljg3NDMgMzEuODU5MkMxOC44ODU5IDMxLjQ4NTMgMjAuODEzOSAzMC43NzI0IDIyLjU5MjkgMjkuNzM2M0MyNC4wNTU3IDI4Ljg2OTcgMjUuMzY4OSAyNy43NjYzIDI2LjQ4MjkgMjYuNDc1MUMyOC4zNjEyIDI0LjMxODEgMjkuNDc1MSAyMS45MDYgMzAuMjg5OCAxOS43NjU2SDMwLjYyMjRDMzIuNjY3NCAxOS43NjU2IDMzLjkzMDIgMTguOTMzMSAzNC42Mjg2IDE4LjIyMDJDMzUuMDkzNyAxNy43NzgyIDM1LjQ0MzMgMTcuMjM0OCAzNS42OTIyIDE2LjYyMzJMMzUuODQxOCAxNi4xODEyTDM1LjQ5MyAxNS45MjYyTDM1LjQ5MjIgMTUuOTI0NloiIGZpbGw9IiMwMDkxRTIiLz48L3N2Zz4K
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	// List pages to act on, tested against the hash route (e.g. #!/2/docker/containers)
	const ROUTE_PATTERN = /\/(docker\/(containers|images|networks|volumes)|(docker\/)?templates\/custom)\/?$/;

	// Selects already handled, so a manual change by the user is not overridden
	const handled = new WeakSet();

	// Native value setter, needed so React registers the change on a controlled select
	const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;

	let pending = null;

	// Check whether the current hash route is one of the target list pages
	function isTargetRoute() {
		const route = location.hash.split('?')[0];
		return ROUTE_PATTERN.test(route);
	}

	// Return the 'All' option of a pagination select, or null if it is not one
	function getAllOption(select) {
		const option = Array.from(select.options).find(function(opt) {
			return opt.textContent.trim().toLowerCase() === 'all';
		});
		if (!option) return null;

		// Confirm it is the page size selector by its data-cy attribute or nearby label text
		if (select.matches('[data-cy="paginationSelect"]')) return option;
		const wrapper = select.closest('.limitSelector, .paginationControls, .pagination') || select.parentElement;
		if (wrapper && /items per page/i.test(wrapper.textContent)) return option;

		return null;
	}

	// Find every pagination select on the page and set it to 'All'
	function applyAll() {
		pending = null;
		if (!isTargetRoute()) return;

		document.querySelectorAll('select').forEach(function(select) {
			if (handled.has(select)) return;

			const allOption = getAllOption(select);
			if (!allOption) return;

			handled.add(select);

			// Already showing all items, nothing to do
			if (select.value === allOption.value) return;

			// Set the value in a way both React and AngularJS will detect
			nativeSetter.call(select, allOption.value);
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
	}

	// Debounce checks so rapid DOM updates only trigger one pass
	function schedule() {
		if (pending) clearTimeout(pending);
		pending = setTimeout(applyAll, 250);
	}

	// Watch for tables being rendered or replaced as the app updates
	const observer = new MutationObserver(schedule);
	observer.observe(document.body, { childList: true, subtree: true });

	// Portainer is a single-page app, so route changes only alter the hash
	window.addEventListener('hashchange', schedule);

	// Initial check in case the table is already present
	schedule();
})();
