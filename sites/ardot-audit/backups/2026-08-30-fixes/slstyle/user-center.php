<?php
/**
 * Template Name: 用户中心
 * 前端用户中心：登录 / 注册、个人资料、我的收藏、我的文章
 */
get_header();
?>

<main class="site-main">
	<div class="container">
		<div class="layout">
			<div class="content">
				<?php slstyle_breadcrumbs(); ?>

				<div class="user-center">
					<?php if ( ! is_user_logged_in() ) : ?>
						<div class="uc-head">
							<div class="uc-avatar">👤</div>
							<div>
								<div class="uc-name"><?php esc_html_e( '欢迎访问用户中心', 'slstyle' ); ?></div>
								<div class="uc-role"><?php esc_html_e( '登录后查看收藏、资料与文章', 'slstyle' ); ?></div>
							</div>
						</div>
						<div class="uc-tabs">
							<a class="active" href="#login"><?php esc_html_e( '登录', 'slstyle' ); ?></a>
							<a href="<?php echo esc_url( wp_registration_url() ); ?>"><?php esc_html_e( '注册', 'slstyle' ); ?></a>
						</div>
						<?php
						if ( isset( $_GET['login'] ) && 'failed' === $_GET['login'] ) {
							echo '<div class="uc-msg err">' . esc_html__( '用户名或密码错误', 'slstyle' ) . '</div>';
						}
						wp_login_form( array(
							'redirect'       => home_url( '/user-center/' ),
							'label_username' => __( '用户名 / 邮箱', 'slstyle' ),
							'label_password' => __( '密码', 'slstyle' ),
						) );
						?>
					<?php else : ?>
						<?php
						$cur = get_current_user_id();
						$u   = wp_get_current_user();
						$tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'profile';
						?>
						<div class="uc-head">
							<div class="uc-avatar"><?php echo get_avatar( $cur, 64, '', '', array( 'class' => '' ) ); ?></div>
							<div>
								<div class="uc-name"><?php echo esc_html( $u->display_name ); ?></div>
								<div class="uc-role"><?php echo esc_html( $u->user_email ); ?></div>
							</div>
						</div>
						<div class="uc-tabs">
							<a class="<?php echo ( 'profile' === $tab ) ? 'active' : ''; ?>" href="?tab=profile"><?php esc_html_e( '个人资料', 'slstyle' ); ?></a>
							<a class="<?php echo ( 'favs' === $tab ) ? 'active' : ''; ?>" href="?tab=favs"><?php esc_html_e( '我的收藏', 'slstyle' ); ?></a>
							<a class="<?php echo ( 'posts' === $tab ) ? 'active' : ''; ?>" href="?tab=posts"><?php esc_html_e( '我的文章', 'slstyle' ); ?></a>
						</div>

						<?php if ( 'profile' === $tab ) : ?>
							<?php
							if ( isset( $_POST['uc_save_profile'] ) && check_admin_referer( 'uc_profile', 'uc_profile_nonce' ) ) {
								$updated = wp_update_user( array(
									'ID'           => $cur,
									'display_name' => sanitize_text_field( $_POST['display_name'] ),
									'user_email'   => sanitize_email( $_POST['user_email'] ),
								) );
								echo is_wp_error( $updated )
									? '<div class="uc-msg err">' . esc_html( $updated->get_error_message() ) . '</div>'
									: '<div class="uc-msg ok">' . esc_html__( '资料已更新', 'slstyle' ) . '</div>';
							}
							?>
							<form class="uc-form" method="post">
								<?php wp_nonce_field( 'uc_profile', 'uc_profile_nonce' ); ?>
								<label><?php esc_html_e( '昵称', 'slstyle' ); ?></label>
								<input type="text" name="display_name" value="<?php echo esc_attr( $u->display_name ); ?>">
								<label><?php esc_html_e( '邮箱', 'slstyle' ); ?></label>
								<input type="email" name="user_email" value="<?php echo esc_attr( $u->user_email ); ?>">
								<button class="btn" type="submit" name="uc_save_profile"><?php esc_html_e( '保存资料', 'slstyle' ); ?></button>
							</form>

						<?php elseif ( 'favs' === $tab ) : ?>
							<?php $favs = slstyle_get_favs( $cur ); ?>
							<?php if ( empty( $favs ) ) : ?>
								<p class="act-meta"><?php esc_html_e( '还没有收藏任何文章，去文章页点击 ★ 收藏吧。', 'slstyle' ); ?></p>
							<?php else : ?>
								<div class="uc-list">
									<?php foreach ( $favs as $fid ) : ?>
										<?php $p = get_post( $fid ); if ( ! $p ) { continue; } setup_postdata( $p ); ?>
										<div class="uc-item">
											<a class="uc-thumb" href="<?php the_permalink(); ?>" style="background-image:url('<?php echo esc_url( slstyle_thumb() ); ?>')"></a>
											<div>
												<a class="uc-title" href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
												<div class="uc-date"><?php echo get_the_date(); ?> · <?php echo slstyle_post_views(); ?> 阅读</div>
											</div>
										</div>
									<?php endforeach; wp_reset_postdata(); ?>
								</div>
							<?php endif; ?>

						<?php elseif ( 'posts' === $tab ) : ?>
							<?php $my = new WP_Query( array( 'author' => $cur, 'post_status' => 'publish', 'posts_per_page' => 20 ) ); ?>
							<?php if ( ! $my->have_posts() ) : ?>
								<p class="act-meta"><?php esc_html_e( '你还没有发布文章。', 'slstyle' ); ?></p>
							<?php else : ?>
								<div class="uc-list">
									<?php while ( $my->have_posts() ) : $my->the_post(); ?>
										<div class="uc-item">
											<a class="uc-thumb" href="<?php the_permalink(); ?>" style="background-image:url('<?php echo esc_url( slstyle_thumb() ); ?>')"></a>
											<div>
												<a class="uc-title" href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
												<div class="uc-date"><?php echo get_the_date(); ?></div>
											</div>
										</div>
									<?php endwhile; wp_reset_postdata(); ?>
								</div>
							<?php endif; ?>
						<?php endif; ?>
					<?php endif; ?>
				</div>
			</div>

			<?php get_sidebar(); ?>
		</div>
	</div>
</main>

<?php
get_footer();
