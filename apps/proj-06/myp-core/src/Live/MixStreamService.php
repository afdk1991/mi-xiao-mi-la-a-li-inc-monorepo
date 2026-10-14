<?php
/**
 * PK 混流服务：调用 FFmpeg / SRS 混流。
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class MyP_Core_Live_MixStreamService {

	public function mix( $main_stream, $guest_stream, $layout = 'side_by_side' ) {
		// 三种布局：side_by_side / picture_in_picture / top_bottom
		$out = 'myp_mix_' . uniqid();
		$cmd = sprintf(
			'ffmpeg -i %s -i %s -filter_complex "[0:v][1:v]hstack=inputs=2[v]" -map "[v]" -map 0:a %s',
			escapeshellarg( $main_stream ),
			escapeshellarg( $guest_stream ),
			escapeshellarg( $out )
		);
		// 生产环境通过 SRS HTTP 回调或 Docker exec 执行；此处仅记录
		return array( 'out_stream' => $out, 'layout' => $layout, 'cmd' => $cmd );
	}
}
