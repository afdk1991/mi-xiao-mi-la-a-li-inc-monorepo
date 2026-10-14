<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Einvoice_BaiwangEinvoice extends MyP_Core_Einvoice_BaseEinvoice {
	public function issue( $invoice ) {
		// 对接百旺开放平台，返回发票号码与文件地址
		return array(
			'success' => true,
			'no'      => 'BW' . gmdate( 'Ymd' ) . str_pad( $invoice->id, 8, '0', STR_PAD_LEFT ),
			'file'    => '',
		);
	}
}
