/* SaaS Aggregator - 后台设置页交互（原生 JS）。 */
( function () {
	document.addEventListener( 'DOMContentLoaded', function () {
		var fieldsets = document.querySelectorAll( '.saas-agg-provider' );
		fieldsets.forEach( function ( fs ) {
			var toggle = fs.querySelector( '.saas-agg-enable' );
			if ( ! toggle ) {
				return;
			}
			var sync = function () {
				fs.classList.toggle( 'is-disabled', ! toggle.checked );
			};
			toggle.addEventListener( 'change', sync );
			sync();
		} );
	} );
} )();
