'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import type { LocalizedText } from './types';

// ── Language type ─────────────────────────────────────────────────────────────

export type Lang = 'vi' | 'en';

// ── Full bilingual dictionary ─────────────────────────────────────────────────
// Covers ALL hardcoded strings found in: AppShell, login, pos, inventory,
// analytics, and menu pages.  Keys use snake_case with a page-prefix.

const dict: Record<Lang, Record<string, string>> = {

  // ════════════════════════════════════════════════════════════════════════════
  vi: {

    // ── App-wide / Common ────────────────────────────────────────────────────
    loading:                      'Đang tải…',
    btn_cancel:                   'Hủy',
    btn_close:                    'Đóng',
    btn_confirm:                  'Xác nhận',
    btn_save:                     'Lưu',
    btn_saving:                   'Đang lưu…',
    btn_edit:                     'Sửa',
    btn_delete:                   'Xóa',
    btn_deleting:                 'Đang xóa…',
    btn_save_changes:             'Lưu thay đổi',
    lbl_total:                    'Tổng cộng',
    err_network:                  'Không thể tải dữ liệu — kiểm tra kết nối.',
    lbl_required:                 '(bắt buộc)',
    lbl_optional:                 '(không bắt buộc)',
    lbl_translate_btn:            'Dịch tự động',
    lbl_translate_err:            'Không thể dịch tự động, vui lòng nhập thủ công',
    err_save_timeout:             '✗ Lưu thất bại — kiểm tra kết nối mạng và thử lại',

    // ── Categories (used in POS tabs and Menu form dropdown) ─────────────────
    cat_all:                      'Tất cả',
    cat_coffee:                   'Cà phê',
    cat_tea:                      'Trà',
    cat_smoothie:                 'Sinh tố',
    cat_snack:                    'Đồ ăn nhẹ',

    // ── AppShell nav & chrome ────────────────────────────────────────────────
    nav_pos:                      'Bán hàng',
    nav_inventory:                'Kho nguyên liệu',
    nav_analytics:                'Phân tích',
    nav_menu:                     'Quản lý menu',
    role_owner:                   'Chủ quán',
    role_staff:                   'Nhân viên',
    btn_logout:                   'Đăng xuất',
    aria_open_sidebar:            'Mở menu',
    aria_close_sidebar:           'Đóng menu',
    aria_lang_switch:             'Chuyển ngôn ngữ',

    // ── Login page ───────────────────────────────────────────────────────────
    login_subtitle:               'Hệ thống quản lý quán cà phê',
    login_heading:                'Đăng nhập',
    login_email_label:            'Email',
    login_email_placeholder:      'ten@example.com',
    login_password_label:         'Mật khẩu',
    login_password_placeholder:   'Tối thiểu 6 ký tự',
    login_btn:                    'Đăng nhập',
    login_btn_loading:            'Đang đăng nhập…',
    login_aria_show_pw:           'Hiện mật khẩu',
    login_aria_hide_pw:           'Ẩn mật khẩu',
    login_err_email_required:     'Vui lòng nhập email',
    login_err_email_format:       'Email không đúng định dạng',
    login_err_pw_required:        'Vui lòng nhập mật khẩu',
    login_err_pw_length:          'Mật khẩu phải có ít nhất 6 ký tự',
    login_err_invalid_credential: 'Email hoặc mật khẩu không chính xác',
    login_err_too_many_requests:  'Quá nhiều lần thử, vui lòng thử lại sau ít phút',
    login_err_user_disabled:      'Tài khoản đã bị vô hiệu hóa',
    login_err_network:            'Không có kết nối mạng, vui lòng kiểm tra lại',
    login_err_default:            'Đăng nhập thất bại, vui lòng thử lại',

    // ── POS page ─────────────────────────────────────────────────────────────
    pos_title:                    'Chọn món',
    pos_err_load:                 'Không thể tải menu — kiểm tra kết nối.',
    pos_out_of_stock:             'Hết hàng',
    pos_empty_category:           'Không có món nào trong danh mục này',
    pos_cart_title:               'Đơn hàng',
    pos_cart_empty:               'Chưa có món nào',
    pos_payment_cash:             'Tiền mặt',
    pos_payment_transfer:         'Chuyển khoản',
    pos_btn_confirm_payment:      'Xác nhận thanh toán',
    pos_modal_title:              'Xác nhận đơn hàng',
    pos_payment_label:            'Thanh toán:',
    pos_btn_processing:           'Đang xử lý…',
    pos_btn_done:                 'Hoàn thành',
    pos_toast_success:            '✓ Tạo đơn thành công',
    pos_toast_error:              '✗ Tạo đơn thất bại, vui lòng thử lại',
    pos_aria_remove_item:         'Xóa',

    // ── Inventory page ───────────────────────────────────────────────────────
    inv_title:                    'Kho nguyên liệu',
    inv_count:                    'nguyên liệu',
    inv_alert_prefix:             'nguyên liệu cần chú ý —',
    inv_alert_out:                'hết hàng',
    inv_alert_low:                'sắp hết',
    inv_search_placeholder:       'Tìm nguyên liệu...',
    inv_col_name:                 'Nguyên liệu',
    inv_col_unit:                 'Đơn vị',
    inv_col_stock:                'Tồn kho',
    inv_col_threshold:            'Ngưỡng cảnh báo',
    inv_col_status:               'Trạng thái',
    inv_col_supplier:             'Nhà cung cấp',
    inv_col_action:               'Thao tác',
    inv_status_in_stock:          'Còn hàng',
    inv_status_low:               'Sắp hết',
    inv_status_out:               'Hết hàng',
    inv_err_load:                 'Không thể tải dữ liệu — kiểm tra kết nối.',
    inv_empty:                    'Không tìm thấy nguyên liệu nào',
    inv_no_supplier:              'Chưa có',
    inv_btn_restock:              'Nhập hàng',
    // Restock modal
    inv_restock_modal_title:      'Nhập hàng',
    inv_restock_ingredient_label: 'Nguyên liệu:',
    inv_restock_current_stock:    'Tồn kho hiện tại:',
    inv_restock_qty_label:        'Số lượng nhập thêm',
    inv_restock_qty_placeholder:  'Nhập số lượng',
    inv_restock_err:              'Vui lòng nhập số lượng hợp lệ (lớn hơn 0)',
    inv_restock_btn_loading:      'Đang lưu…',
    inv_toast_restock_success:    '✓ Đã nhập thêm',
    inv_toast_restock_restored:   'món đã mở bán lại',
    inv_toast_restock_error:      '✗ Nhập hàng thất bại, vui lòng thử lại',
    // Supplier detail modal
    inv_supplier_context_label:   'Nhà cung cấp ·',
    inv_supplier_phone:           'Điện thoại',
    inv_supplier_zalo:            'Zalo',
    inv_supplier_address:         'Địa chỉ',
    // Edit ingredient modal
    inv_edit_modal_title:         'Chỉnh sửa nguyên liệu',
    inv_edit_name_label:          'Tên nguyên liệu (tiếng Việt)',
    inv_edit_name_placeholder:    'Ví dụ: Hạt cà phê',
    inv_edit_name_en_label:       'Tên nguyên liệu (tiếng Anh)',
    inv_edit_name_en_placeholder: 'Ví dụ: Coffee beans',
    inv_edit_unit_label:          'Đơn vị',
    inv_edit_unit_placeholder:    'g, ml, kg…',
    inv_edit_threshold_label:     'Ngưỡng cảnh báo',
    inv_edit_supplier_section:    'Thông tin nhà cung cấp',
    inv_edit_supplier_yes:        'Có',
    inv_edit_supplier_no:         'Không',
    inv_edit_sup_name_label:      'Tên nhà cung cấp',
    inv_edit_sup_name_placeholder:'Ví dụ: Công ty TNHH Cà phê Tây Nguyên',
    inv_edit_sup_phone_label:     'Điện thoại',
    inv_edit_sup_phone_placeholder:'0901 234 567',
    inv_edit_sup_zalo_label:      'Zalo',
    inv_edit_sup_zalo_placeholder:'Số Zalo (nếu khác ĐT)',
    inv_edit_sup_address_label:   'Địa chỉ',
    inv_edit_sup_address_placeholder: 'Số nhà, đường, quận, tỉnh/thành phố',
    inv_edit_btn_save:            'Lưu thay đổi',
    inv_edit_btn_saving:          'Đang lưu…',
    inv_err_name:                 'Vui lòng nhập tên nguyên liệu (tiếng Việt)',
    inv_err_name_en:              'Vui lòng nhập tên nguyên liệu (tiếng Anh)',
    inv_err_unit:                 'Vui lòng nhập đơn vị',
    inv_err_threshold:            'Ngưỡng phải ≥ 0',
    inv_err_sup_name:             'Vui lòng nhập tên nhà cung cấp',
    inv_err_sup_phone:            'Vui lòng nhập số điện thoại',
    inv_toast_edit_success:       '✓ Đã cập nhật',
    inv_toast_edit_error:         '✗ Cập nhật thất bại, vui lòng thử lại',

    // ── Analytics page ───────────────────────────────────────────────────────
    analytics_title:              'Phân tích',
    analytics_data_prefix:        'Dữ liệu hôm nay ·',
    analytics_updated_at:         'Cập nhật lúc',
    analytics_loading_label:      'Đang tải…',
    analytics_btn_refresh:        'Làm mới',
    analytics_err_load:           'Không thể tải dữ liệu — kiểm tra kết nối rồi nhấn Làm mới.',
    analytics_kpi_revenue:        'Doanh thu hôm nay',
    analytics_kpi_orders:         'Số đơn hàng',
    analytics_kpi_best_seller:    'Món bán chạy nhất',
    analytics_kpi_low_stock:      'Nguyên liệu sắp hết',
    analytics_kpi_low_stock_sub:  'Nhấn để xem chi tiết',
    analytics_kpi_low_stock_ok:   'Đủ hàng',
    analytics_kpi_low_stock_unit: 'mục',
    analytics_kpi_orders_unit:    'đơn',
    analytics_chart_hourly:       'Doanh thu theo giờ',
    analytics_chart_top5:         'Top 5 món bán chạy',
    analytics_chart_payment:      'Hình thức thanh toán',
    analytics_tooltip_revenue:    'Doanh thu',
    analytics_tooltip_qty:        'Số lượng',
    analytics_tooltip_orders_unit:'đơn',
    analytics_payment_cash:       'Tiền mặt',
    analytics_payment_transfer:   'Chuyển khoản',
    analytics_empty_title:        'Chưa có dữ liệu hôm nay',
    analytics_empty_sub:          'Dữ liệu sẽ xuất hiện khi đơn hàng đầu tiên được tạo',

    // ── Menu management page ─────────────────────────────────────────────────
    menu_title:                   'Quản lý menu',
    menu_count_unit:              'món',
    menu_btn_add:                 'Thêm món mới',
    menu_err_load:                'Không thể tải dữ liệu — kiểm tra kết nối.',
    menu_col_name:                'Tên món',
    menu_col_category:            'Danh mục',
    menu_col_price:               'Giá',
    menu_col_status:              'Trạng thái',
    menu_col_recipe:              'Công thức',
    menu_col_action:              'Thao tác',
    menu_status_available:        'Đang bán',
    menu_status_unavailable:      'Ngừng bán',
    menu_recipe_none:             'Không có',
    menu_recipe_unit:             'nguyên liệu',
    menu_empty:                   'Chưa có món nào — nhấn "Thêm món mới" để bắt đầu.',
    // Add / Edit modal
    menu_modal_add_title:         'Thêm món mới',
    menu_modal_edit_title:        'Chỉnh sửa món',
    menu_form_name_label:         'Tên món (tiếng Việt)',
    menu_form_name_placeholder:   'Ví dụ: Cà phê đen',
    menu_form_name_en_label:      'Tên món (tiếng Anh)',
    menu_form_name_en_placeholder:'e.g. Black coffee',
    menu_form_category_label:     'Danh mục',
    menu_form_price_label:        'Giá (VND)',
    menu_form_price_placeholder:  'Ví dụ: 35000',
    menu_form_status_label:       'Trạng thái bán',
    menu_form_recipe_label:       'Công thức (nguyên liệu)',
    menu_form_add_ingredient:     'Thêm nguyên liệu',
    menu_form_loading_ingredients:'Đang tải danh sách nguyên liệu…',
    menu_form_recipe_empty:       'Chưa có — nhấn "Thêm nguyên liệu" để thêm công thức',
    menu_form_select_ingredient:  '— Chọn nguyên liệu —',
    menu_form_qty_placeholder:    'Số lượng',
    menu_form_remove_line_aria:   'Xóa dòng này',
    menu_btn_save:                'Lưu',
    menu_btn_saving:              'Đang lưu…',
    menu_warning_auto_unavailable:'Đã tự động đặt về "Ngừng bán" vì các nguyên liệu sau đang hết hàng:',
    // Delete dialog
    menu_delete_title:            'Xác nhận xóa',
    menu_delete_body:             'Bạn có chắc muốn xóa món',
    menu_delete_warning:          'Thao tác này không thể hoàn tác.',
    // Toasts & validation
    menu_toast_added:             '✓ Đã thêm',
    menu_toast_updated:           '✓ Đã cập nhật',
    menu_toast_save_error:        '✗ Lưu thất bại, vui lòng thử lại',
    menu_toast_deleted:           '✓ Đã xóa',
    menu_toast_delete_error:      '✗ Xóa thất bại, vui lòng thử lại',
    menu_err_name:                'Vui lòng nhập tên món (tiếng Việt)',
    menu_err_name_en:             'Vui lòng nhập tên món (tiếng Anh)',
    menu_err_price:               'Giá phải lớn hơn 0',
    menu_err_select_ingredient:   'Chọn nguyên liệu',
    menu_err_ingredient_qty:      'Số lượng > 0',
  },

  // ════════════════════════════════════════════════════════════════════════════
  en: {

    // ── App-wide / Common ────────────────────────────────────────────────────
    loading:                      'Loading…',
    btn_cancel:                   'Cancel',
    btn_close:                    'Close',
    btn_confirm:                  'Confirm',
    btn_save:                     'Save',
    btn_saving:                   'Saving…',
    btn_edit:                     'Edit',
    btn_delete:                   'Delete',
    btn_deleting:                 'Deleting…',
    btn_save_changes:             'Save changes',
    lbl_total:                    'Total',
    err_network:                  'Cannot load data — check your connection.',
    lbl_required:                 '(required)',
    lbl_optional:                 '(optional)',
    lbl_translate_btn:            'Auto-translate',
    lbl_translate_err:            'Cannot translate automatically, please enter manually',
    err_save_timeout:             '✗ Save failed — check your network connection and try again',

    // ── Categories ───────────────────────────────────────────────────────────
    cat_all:                      'All',
    cat_coffee:                   'Coffee',
    cat_tea:                      'Tea',
    cat_smoothie:                 'Smoothie',
    cat_snack:                    'Light snacks',

    // ── AppShell nav & chrome ────────────────────────────────────────────────
    nav_pos:                      'Sales',
    nav_inventory:                'Inventory',
    nav_analytics:                'Analytics',
    nav_menu:                     'Menu management',
    role_owner:                   'Owner',
    role_staff:                   'Staff',
    btn_logout:                   'Log out',
    aria_open_sidebar:            'Open menu',
    aria_close_sidebar:           'Close menu',
    aria_lang_switch:             'Switch language',

    // ── Login page ───────────────────────────────────────────────────────────
    login_subtitle:               'Coffee shop management system',
    login_heading:                'Sign in',
    login_email_label:            'Email',
    login_email_placeholder:      'name@example.com',
    login_password_label:         'Password',
    login_password_placeholder:   'At least 6 characters',
    login_btn:                    'Sign in',
    login_btn_loading:            'Signing in…',
    login_aria_show_pw:           'Show password',
    login_aria_hide_pw:           'Hide password',
    login_err_email_required:     'Please enter your email',
    login_err_email_format:       'Invalid email format',
    login_err_pw_required:        'Please enter your password',
    login_err_pw_length:          'Password must be at least 6 characters',
    login_err_invalid_credential: 'Incorrect email or password',
    login_err_too_many_requests:  'Too many attempts, please try again later',
    login_err_user_disabled:      'This account has been disabled',
    login_err_network:            'No network connection, please check and try again',
    login_err_default:            'Sign-in failed, please try again',

    // ── POS page ─────────────────────────────────────────────────────────────
    pos_title:                    'Select items',
    pos_err_load:                 'Cannot load menu — check your connection.',
    pos_out_of_stock:             'Out of stock',
    pos_empty_category:           'No items in this category',
    pos_cart_title:               'Order',
    pos_cart_empty:               'No items yet',
    pos_payment_cash:             'Cash',
    pos_payment_transfer:         'Bank transfer',
    pos_btn_confirm_payment:      'Confirm payment',
    pos_modal_title:              'Confirm order',
    pos_payment_label:            'Payment:',
    pos_btn_processing:           'Processing…',
    pos_btn_done:                 'Complete',
    pos_toast_success:            '✓ Order created successfully',
    pos_toast_error:              '✗ Failed to create order, please try again',
    pos_aria_remove_item:         'Remove',

    // ── Inventory page ───────────────────────────────────────────────────────
    inv_title:                    'Inventory',
    inv_count:                    'ingredients',
    inv_alert_prefix:             'ingredients need attention —',
    inv_alert_out:                'out of stock',
    inv_alert_low:                'running low',
    inv_search_placeholder:       'Search ingredients...',
    inv_col_name:                 'Ingredient',
    inv_col_unit:                 'Unit',
    inv_col_stock:                'Stock',
    inv_col_threshold:            'Alert threshold',
    inv_col_status:               'Status',
    inv_col_supplier:             'Supplier',
    inv_col_action:               'Actions',
    inv_status_in_stock:          'In stock',
    inv_status_low:               'Running low',
    inv_status_out:               'Out of stock',
    inv_err_load:                 'Cannot load data — check your connection.',
    inv_empty:                    'No ingredients found',
    inv_no_supplier:              'None yet',
    inv_btn_restock:              'Restock',
    // Restock modal
    inv_restock_modal_title:      'Restock',
    inv_restock_ingredient_label: 'Ingredient:',
    inv_restock_current_stock:    'Current stock:',
    inv_restock_qty_label:        'Quantity to add',
    inv_restock_qty_placeholder:  'Enter quantity',
    inv_restock_err:              'Please enter a valid quantity (greater than 0)',
    inv_restock_btn_loading:      'Saving…',
    inv_toast_restock_success:    '✓ Restocked',
    inv_toast_restock_restored:   'items back on sale',
    inv_toast_restock_error:      '✗ Restock failed, please try again',
    // Supplier detail modal
    inv_supplier_context_label:   'Supplier ·',
    inv_supplier_phone:           'Phone',
    inv_supplier_zalo:            'Zalo',
    inv_supplier_address:         'Address',
    // Edit ingredient modal
    inv_edit_modal_title:         'Edit ingredient',
    inv_edit_name_label:          'Ingredient name (Vietnamese)',
    inv_edit_name_placeholder:    'e.g. Hạt cà phê',
    inv_edit_name_en_label:       'Ingredient name (English)',
    inv_edit_name_en_placeholder: 'e.g. Coffee beans',
    inv_edit_unit_label:          'Unit',
    inv_edit_unit_placeholder:    'g, ml, kg…',
    inv_edit_threshold_label:     'Alert threshold',
    inv_edit_supplier_section:    'Supplier information',
    inv_edit_supplier_yes:        'Yes',
    inv_edit_supplier_no:         'No',
    inv_edit_sup_name_label:      'Supplier name',
    inv_edit_sup_name_placeholder:'e.g. Tay Nguyen Coffee Co.',
    inv_edit_sup_phone_label:     'Phone',
    inv_edit_sup_phone_placeholder:'+84 901 234 567',
    inv_edit_sup_zalo_label:      'Zalo',
    inv_edit_sup_zalo_placeholder:'Zalo number (if different from phone)',
    inv_edit_sup_address_label:   'Address',
    inv_edit_sup_address_placeholder: 'Street, district, city',
    inv_edit_btn_save:            'Save changes',
    inv_edit_btn_saving:          'Saving…',
    inv_err_name:                 'Please enter the ingredient name (Vietnamese)',
    inv_err_name_en:              'Please enter the ingredient name (English)',
    inv_err_unit:                 'Please enter the unit',
    inv_err_threshold:            'Threshold must be ≥ 0',
    inv_err_sup_name:             'Please enter the supplier name',
    inv_err_sup_phone:            'Please enter the phone number',
    inv_toast_edit_success:       '✓ Updated',
    inv_toast_edit_error:         '✗ Update failed, please try again',

    // ── Analytics page ───────────────────────────────────────────────────────
    analytics_title:              'Analytics',
    analytics_data_prefix:        "Today's data ·",
    analytics_updated_at:         'Updated at',
    analytics_loading_label:      'Loading…',
    analytics_btn_refresh:        'Refresh',
    analytics_err_load:           'Cannot load data — check your connection and click Refresh.',
    analytics_kpi_revenue:        "Today's revenue",
    analytics_kpi_orders:         'Order count',
    analytics_kpi_best_seller:    'Best-selling item',
    analytics_kpi_low_stock:      'Low-stock ingredients',
    analytics_kpi_low_stock_sub:  'Tap to view details',
    analytics_kpi_low_stock_ok:   'All stocked',
    analytics_kpi_low_stock_unit: 'items',
    analytics_kpi_orders_unit:    'orders',
    analytics_chart_hourly:       'Revenue by hour',
    analytics_chart_top5:         'Top 5 best-selling items',
    analytics_chart_payment:      'Payment methods',
    analytics_tooltip_revenue:    'Revenue',
    analytics_tooltip_qty:        'Quantity',
    analytics_tooltip_orders_unit:'orders',
    analytics_payment_cash:       'Cash',
    analytics_payment_transfer:   'Bank transfer',
    analytics_empty_title:        'No data yet today',
    analytics_empty_sub:          'Data will appear once the first order is placed',

    // ── Menu management page ─────────────────────────────────────────────────
    menu_title:                   'Menu management',
    menu_count_unit:              'items',
    menu_btn_add:                 'Add new item',
    menu_err_load:                'Cannot load data — check your connection.',
    menu_col_name:                'Item name',
    menu_col_category:            'Category',
    menu_col_price:               'Price',
    menu_col_status:              'Status',
    menu_col_recipe:              'Recipe',
    menu_col_action:              'Actions',
    menu_status_available:        'On sale',
    menu_status_unavailable:      'Off sale',
    menu_recipe_none:             'None',
    menu_recipe_unit:             'ingredients',
    menu_empty:                   'No items yet — click "Add new item" to get started.',
    // Add / Edit modal
    menu_modal_add_title:         'Add new item',
    menu_modal_edit_title:        'Edit item',
    menu_form_name_label:         'Item name (Vietnamese)',
    menu_form_name_placeholder:   'e.g. Cà phê đen',
    menu_form_name_en_label:      'Item name (English)',
    menu_form_name_en_placeholder:'e.g. Black coffee',
    menu_form_category_label:     'Category',
    menu_form_price_label:        'Price (VND)',
    menu_form_price_placeholder:  'e.g. 35000',
    menu_form_status_label:       'Sale status',
    menu_form_recipe_label:       'Recipe (ingredients)',
    menu_form_add_ingredient:     'Add ingredient',
    menu_form_loading_ingredients:'Loading ingredients…',
    menu_form_recipe_empty:       'None yet — click "Add ingredient" to add a recipe',
    menu_form_select_ingredient:  '— Select ingredient —',
    menu_form_qty_placeholder:    'Quantity',
    menu_form_remove_line_aria:   'Remove this line',
    menu_btn_save:                'Save',
    menu_btn_saving:              'Saving…',
    menu_warning_auto_unavailable:'Automatically set to "Off sale" because the following ingredients are out of stock:',
    // Delete dialog
    menu_delete_title:            'Confirm deletion',
    menu_delete_body:             'Are you sure you want to delete',
    menu_delete_warning:          'This action cannot be undone.',
    // Toasts & validation
    menu_toast_added:             '✓ Added',
    menu_toast_updated:           '✓ Updated',
    menu_toast_save_error:        '✗ Save failed, please try again',
    menu_toast_deleted:           '✓ Deleted',
    menu_toast_delete_error:      '✗ Delete failed, please try again',
    menu_err_name:                'Please enter the item name (Vietnamese)',
    menu_err_name_en:             'Please enter the item name (English)',
    menu_err_price:               'Price must be greater than 0',
    menu_err_select_ingredient:   'Select an ingredient',
    menu_err_ingredient_qty:      'Quantity must be > 0',
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang:    Lang;
  setLang: (l: Lang) => void;
  t:       (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang:    'vi',
  setLang: () => {},
  t:       (key) => key,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('vi');

  // Restore saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cafeos_lang') as Lang | null;
      if (saved === 'vi' || saved === 'en') {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // localStorage unavailable (SSR or privacy mode) — silently keep 'vi'
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('cafeos_lang', l);
      document.documentElement.lang = l;
    } catch { /* ignore */ }
  };

  const t = (key: string): string =>
    dict[lang][key] ?? dict.vi[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useLanguage = () => useContext(LanguageContext);

// ── LocalizedText helper ──────────────────────────────────────────────────────
// Handles both new LocalizedText objects and legacy Firestore docs with string names.

export function getLocalized(
  text: LocalizedText | string | null | undefined,
  lang: Lang,
): string {
  if (!text) return '';
  if (typeof text === 'string') return text;   // legacy string doc — return as-is
  return text[lang] || text.vi || text.en || '';
}

// Coerce a runtime string OR LocalizedText → always returns a proper LocalizedText object.
// Needed because Firestore docs created before the migration carry name as a plain string,
// but TypeScript only sees the type-asserted LocalizedText.  Use this anywhere a
// LocalizedText must be WRITTEN (e.g. into orders), not just read.
export function ensureLocalized(name: LocalizedText | string): LocalizedText {
  if (typeof name === 'string') return { vi: name, en: name };
  return name;
}
