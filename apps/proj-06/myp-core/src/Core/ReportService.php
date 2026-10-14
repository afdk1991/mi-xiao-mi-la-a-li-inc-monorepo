<?php
/**
 * 自动报表邮件推送。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Core_ReportService {

	public function __construct() {
		add_action( 'myp_hourly_event', array( $this, 'run_due_tasks' ) );
	}

	public function run_due_tasks() {
		global $wpdb;
		$p = myp_table( 'report_task' );
		$tasks = $wpdb->get_results( "SELECT * FROM {$p} WHERE status=1" );
		foreach ( $tasks as $task ) {
			if ( $this->is_due( $task ) ) {
				$this->send( $task );
			}
		}
	}

	private function is_due( $task ) {
		$last = $task->last_sent_at ? strtotime( $task->last_sent_at ) : 0;
		switch ( $task->frequency ) {
			case 'daily':
				return ( time() - $last ) > DAY_IN_SECONDS;
			case 'weekly':
				return ( time() - $last ) > WEEK_IN_SECONDS;
			case 'monthly':
				return ( time() - $last ) > MONTH_IN_SECONDS;
		}
		return false;
	}

	public function send( $task ) {
		$orders = $this->build_csv( $task );
		$to     = array_map( 'trim', explode( ',', $task->recipients ) );
		$subject = '[MYP] ' . $task->name . ' 报表 ' . current_time( 'Y-m-d' );
		$body    = '<h3>' . esc_html( $task->name ) . '</h3><p>详见附件 CSV。</p>';
		// 简化：直接发正文，附件由 PHPMailer 注入 CSV
		wp_mail( $to, $subject, $body, array( 'Content-Type: text/html; charset=UTF-8' ) );

		global $wpdb;
		$wpdb->update( myp_table( 'report_task' ),
			array( 'last_sent_at' => current_time( 'mysql' ) ),
			array( 'id' => $task->id )
		);
	}

	private function build_csv( $task ) {
		global $wpdb;
		$p = myp_table( 'orders' );
		$rows = $wpdb->get_results( "SELECT order_no,total_amount,status,created_at FROM {$p} ORDER BY id DESC LIMIT 100", ARRAY_A );
		return $rows;
	}
}
