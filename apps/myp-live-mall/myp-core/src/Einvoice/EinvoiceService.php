<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Einvoice_EinvoiceService {
	public static function issue( $invoice ) {
		$adapter = new MyP_Core_Einvoice_BaiwangEinvoice();
		$result  = $adapter->issue( $invoice );
		if ( ! empty( $result['success'] ) ) {
			( new MyP_Core_Database_InvoiceModel() )->approve( $invoice->id, $result['no'], $result['file'] );
		}
		return $result;
	}
}
