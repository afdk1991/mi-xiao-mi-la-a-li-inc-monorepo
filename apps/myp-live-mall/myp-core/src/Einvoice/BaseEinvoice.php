<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class MyP_Core_Einvoice_BaseEinvoice {
	abstract public function issue( $invoice );
}
