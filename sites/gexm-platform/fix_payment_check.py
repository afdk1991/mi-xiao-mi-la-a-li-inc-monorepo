import re

with open('f:/gexm/wp-content/themes/mixm-laal/inc/commerce-functions.php', 'r', encoding='utf-8') as f:
    lines = f.readlines()

insert_code = '''    // 支付方式校验：回调支付方式必须与订单原定支付方式一致（防止用低价支付方式冒充高价支付方式）
    if (!empty($order->payment_method) && $order->payment_method !== $payment_method) {
        error_log(sprintf(
            '[Payment] 支付方式不匹配: 订单 %d 原定方式 %s，回调方式 %s',
            $order_id,
            $order->payment_method,
            $payment_method
        ));
        return new WP_Error('payment_method_mismatch', '支付方式与订单原定方式不匹配');
    }
    
'''

new_lines = lines[:906] + [insert_code] + lines[906:]

with open('f:/gexm/wp-content/themes/mixm-laal/inc/commerce-functions.php', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Success')
