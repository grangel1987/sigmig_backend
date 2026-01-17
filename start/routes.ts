/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'


const auth = middleware.auth()

router.group(() => {
  router.group(() => {
    router.post("login", "#controllers/users/user_controller.login")
    router.post("/client/login", "#controllers/users/user_controller.webClientLogin");
    router.post("/forgot-password", "#controllers/users/user_controller.forgotPassword");
    router.post("/change-password-forgot", "#controllers/users/user_controller.changePasswordForgot");
    router.get("/find/super/:business_id", "#controllers/users/user_controller.findSuperusers");


    router.group(() => {
      router.get("find-user-by-token", "#controllers/users/user_controller.findByToken")
      router.post("/reset-password", "#controllers/users/user_controller.resetPassword");
      // Dedicated change password (authenticated user supplies current & new password)
      router.post("/change-password", "#controllers/users/user_controller.changePasswordOwner");
      router.post("/assign-to-employee", "#controllers/users/user_controller.assignUserToEmployee");
      router.post("/remove-from-employee", "#controllers/users/user_controller.removeUserFromEmployee");
      router.post("/store", "#controllers/users/user_controller.store");
      router.post("/find-by-args", "#controllers/users/user_controller.findByArgs");
      router.get("/find/modules", "#controllers/users/user_controller.findModules");
      router.get("/find/permission/:module_id", "#controllers/users/user_controller.findPermission");
      router.get("/user-admin", "#controllers/users/user_controller.index");
      router.post("/store-admin", "#controllers/users/user_controller.storeAdmin");
      router.post("/code/request", "#controllers/users/user_controller.storeCodeConfirm");
      router.post("/code/confirm/verify", "#controllers/users/user_controller.verifyCodeConfirm");
      router.get("/show/:id", "#controllers/users/user_controller.show");
      router.put("/update-admin/:userId", "#controllers/users/user_controller.updateAdmin");
      router.put("/toggle-status/:id", "#controllers/users/user_controller.toggleUserStatus");
      router.post("/admin-reset-password", "#controllers/users/user_controller.adminResetPassword");
    }).middleware(auth)
    // Password recovery with random password (public, sends email)
    router.post("/recover-password", "#controllers/users/user_controller.recoverPassword");
  }).prefix('account')

  router.group(() => {
    router.get("country/:id", "#controllers/settings/setting_controller.findSettingsByCountry")
  }).prefix('setting')

  // Settings web endpoints
  router.group(() => {
    router.get("/country/web/:id", "#controllers/settings/setting_controller.findSettingsByCountry")
    router.get("/indicators", "#controllers/settings/setting_controller.indicators")
  }).prefix('setting')


  router.group(() => {
    router.post("/store", "#controllers/business/business_controller.store");
    router.get("/find/select/", "#controllers/business/business_controller.findBusinessByUser");
    router.put("/change/:id", "#controllers/business/business_controller.changeBusiness");
    router.get("/find/id/:id", "#controllers/business/business_controller.show");
    router.delete("/delete/photo/:id", "#controllers/business/business_controller.deletePhoto");
    router.put("/update/:id", "#controllers/business/business_controller.update");
  })
    .prefix('/business').middleware(auth)

  router.group(() => {
    router.get("/web/find/id/:id", "#controllers/business/business_controller.show");
  })
    .prefix('business')

  // Roles
  router.group(() => {
    router.get("/", "#controllers/role/rol_controller.index");
    router.post("/store", "#controllers/role/rol_controller.store");
    router.get("/:id", "#controllers/role/rol_controller.show");
    router.put("/update/:id", "#controllers/role/rol_controller.update");
    router.put("/change-status/:id", "#controllers/role/rol_controller.toggleStatus");
    router.get("/select", "#controllers/role/rol_controller.select");
  })
    .prefix('rol')
    .middleware(auth)




  router.group(() => {
    router.get("/", "#controllers/cities/city_controller.index");
    router.post("/store", "#controllers/cities/city_controller.store");
    router.post("/country", "#controllers/cities/city_controller.findByCountry");
    router.put("/update/:id", "#controllers/cities/city_controller.update");
    router.get("/select/:country_id", "#controllers/cities/city_controller.select");
    router.put("/change-status/:id", "#controllers/cities/city_controller.changeStatus");
  })
    .prefix('city')
    .middleware(auth);
  router.group(() => {
    router.get("/web/select/:country_id", "#controllers/cities/city_controller.select");
  })
    .prefix('city')
    .middleware(auth)



  router.group(() => {
    router.get("/", "#controllers/countries/country_controller.index");
    router.get("/find-by-params", "#controllers/countries/country_controller.index");
    router.get("/select", "#controllers/countries/country_controller.select");
    router.put("/update/:id", "#controllers/countries/country_controller.update");
  })
    .prefix(`country`)
    .middleware(auth);

  router.group(() => {
    router.get("/web", "#controllers/countries/country_controller.index");
  })
    .prefix(`country`)

  //work

  router.group(() => {
    router.get("/", "#controllers/works/work_controller.index");
    router.post("/store", "#controllers/works/work_controller.store");
    router.put("/update/:id", "#controllers/works/work_controller.update");
    router.put("/change-status/:id", "#controllers/works/work_controller.changeStatus");
    router.get("/find-all/:business_id", "#controllers/works/work_controller.findAll");
    router.get("/select", "#controllers/works/work_controller.select");
  })
    .prefix("work")
    .middleware(auth)

  router.group(() => {
    router.get("/", "#controllers/cost_centers/cost_center_controller.index");
    router.post("/store", "#controllers/cost_centers/cost_center_controller.store");
    router.put("/update/:id", "#controllers/cost_centers/cost_center_controller.update");
    router.put("/change-status/:id", "#controllers/cost_centers/cost_center_controller.changeStatus");
    router.post("/select", "#controllers/cost_centers/cost_center_controller.select");
    router.get("/show/:id", "#controllers/cost_centers/cost_center_controller.show");
    router.get("/find-all/:business_id", "#controllers/cost_centers/cost_center_controller.findAll");
    router.get("/select/:business_id", "#controllers/cost_centers/cost_center_controller.select");
  })
    .prefix("cost-center")
    .middleware(auth)

  router.group(() => {
    router.get("/", "#controllers/positions/position_controller.index");
    router.post("/store", "#controllers/positions/position_controller.store");
    router.put("/update/:id", "#controllers/positions/position_controller.update");
    router.put("/change-status/:id", "#controllers/positions/position_controller.changeStatus");
    router.get("/select", "#controllers/positions/position_controller.select");
  })
    .prefix("position")
    .middleware(auth)

  //settings items booking
  router.group(() => {
    router.get("/", "#controllers/booking/setting_booking_item_controller.index");
    router.post("/store", "#controllers/booking/setting_booking_item_controller.store");
    router.put("/update/:id", "#controllers/booking/setting_booking_item_controller.update");
    router.put("/change-status/:id", "#controllers/booking/setting_booking_item_controller.changeStatus");
    router.get("/select", "#controllers/booking/setting_booking_item_controller.select");
  })
    .prefix("setting-booking-item")
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/booking/setting_booking_property_controller.index");

    router.post("/store", "#controllers/booking/setting_booking_property_controller.store");
    router.put("/update/:id", "#controllers/booking/setting_booking_property_controller.update");
    router.put(
      "/change-status/:id",
      "#controllers/booking/setting_booking_property_controller.changeStatus"
    );
    router.get("/select", "#controllers/booking/setting_booking_property_controller.select");
  })
    .prefix("setting-booking-propertie")
    .middleware(auth);

  // Budget categories (adapted controller)
  router.group(() => {
    router.get("/", "#controllers/buget/setting_buget_category_controller.index");
    router.post("/store", "#controllers/buget/setting_buget_category_controller.store");
    router.put("/update/:id", "#controllers/buget/setting_buget_category_controller.update");
    router.put(
      "/change-status/:id",
      "#controllers/buget/setting_buget_category_controller.changeStatus"
    );
    router.get("/select", "#controllers/buget/setting_buget_category_controller.select");
    router.delete("/delete/:id", "#controllers/buget/setting_buget_category_controller.delete");
  })
    .prefix("setting-buget-categories")
    .middleware(auth)

  // Budget items (adapted controller)
  router.group(() => {
    router.get("/", "#controllers/buget/setting_buget_item_controller.index");
    router.post("/store", "#controllers/buget/setting_buget_item_controller.store");
    router.put("/update/:id", "#controllers/buget/setting_buget_item_controller.update");
    router.put(
      "/change-status/:id",
      "#controllers/buget/setting_buget_item_controller.changeStatus"
    );
    router.delete("/delete/:id", "#controllers/buget/setting_buget_item_controller.delete");
    // Convenience endpoints provided by this controller
    router.get("/find-by-type/:id", "#controllers/buget/setting_buget_item_controller.findByType");
    router.get("/find-all", "#controllers/buget/setting_buget_item_controller.findAll");
    // Keep legacy-style select using findAll
    router.get("/select", "#controllers/buget/setting_buget_item_controller.findAll");
  })
    .prefix("setting-buget-item")
    .middleware(auth)


  router.group(() => {
    router.get("/", "#controllers/booking/setting_booking_note_controller.index");
    router.post("/store", "#controllers/booking/setting_booking_note_controller.store");
    router.put("/update/:id", "#controllers/booking/setting_booking_note_controller.update");
    router.put("/change-status/:id", "#controllers/booking/setting_booking_note_controller.changeStatus");
    router.get("/select", "#controllers/booking/setting_booking_note_controller.select");
  })
    .prefix("setting-booking-notes")
    .middleware(auth);



  router.group(() => {
    router.get("/", "#controllers/isapres/isapres_controller.index");

    router.post("/store", "#controllers/isapres/isapres_controller.store")

    router.put("/update/:id", "#controllers/isapres/isapres_controller.update");

    router.put("/change-status/:id", "#controllers/isapres/isapres_controller.changeStatus");

    router.get("/select", "#controllers/isapres/isapres_controller.select");
  })
    .prefix('setting-isapres')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/discount/setting_discount_controller.index");
    router.post("/store", "#controllers/discount/setting_discount_controller.store")
    router.put("/update/:id", "#controllers/discount/setting_discount_controller.update");
    router.put("/change-status/:id", "#controllers/discount/setting_discount_controller.changeStatus");
  })
    .prefix('setting-discounts')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/asset/setting_asset_controller.index");
    router.post("/store", "#controllers/asset/setting_asset_controller.store")
    router.put("/update/:id", "#controllers/asset/setting_asset_controller.update");
    router.put("/change-status/:id", "#controllers/asset/setting_asset_controller.changeStatus");
  })
    .prefix('setting-assets')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/afp/afps_controller.index");
    router.post("/store", "#controllers/afp/afps_controller.store")
    router.put("/update/:id", "#controllers/afp/afps_controller.update");
    router.put("/change-status/:id", "#controllers/afp/afps_controller.changeStatus");
    router.get("/select", "#controllers/afp/afps_controller.select");
  })
    .prefix('setting-afp')
    .middleware(auth);



  router.group(() => {
    router.get("/", "#controllers/type_contract/setting_type_contract_controller.index");
    router.post("/store", "#controllers/type_contract/setting_type_contract_controller.store");
    router.put("/update/:type_id", "#controllers/type_contract/setting_type_contract_controller.update");
    router.put(
      "/change-status/:type_id",
      "#controllers/type_contract/setting_type_contract_controller.changeStatus"
    );
    router.get("/select", "#controllers/type_contract/setting_type_contract_controller.select");
  })
    .prefix('/type-contract')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/affiliation/setting_affiliation_controller.index");
    router.post("/store", "#controllers/affiliation/setting_affiliation_controller.store");
    router.put("/update/:id", "#controllers/affiliation/setting_affiliation_controller.update");
    router.put("/change-status/:id", "#controllers/affiliation/setting_affiliation_controller.changeStatus");
    router.get("/select", "#controllers/affiliation/setting_affiliation_controller.select");
  })
    .prefix(`setting-affiliation`)
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/load_family/setting_load_family_controller.index");
    router.post("/store", "#controllers/load_family/setting_load_family_controller.store");
    router.put("/update/:id", "#controllers/load_family/setting_load_family_controller.update");
    router.put("/change-status/:id", "#controllers/load_family/setting_load_family_controller.changeStatus");
    router.get("/select", "#controllers/load_family/setting_load_family_controller.select");
  })
    .prefix(`setting-load-family`)
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/layoff/setting_layoff_controller.index");
    router.post("/store", "#controllers/layoff/setting_layoff_controller.store")
    router.put("/update/:id", "#controllers/layoff/setting_layoff_controller.update");
    router.put("/change-status/:id", "#controllers/layoff/setting_layoff_controller.changeStatus");
    router.get("/select", "#controllers/layoff/setting_layoff_controller.select");
  })
    .prefix(`/setting-layoff`)
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/exregime/setting_ex_regime_controller.index");
    router.post("/store", "#controllers/exregime/setting_ex_regime_controller.store");
    router.put("/update/:id", "#controllers/exregime/setting_ex_regime_controller.update");
    router.put("/change-status/:id", "#controllers/exregime/setting_ex_regime_controller.changeStatus");
    router.get("/select", "#controllers/exregime/setting_ex_regime_controller.select");
  })
    .prefix(`/exregime`)
    .middleware(auth);



  router.group(() => {
    router.get("/", "#controllers/certificate_health_item/setting_certificate_health_item_controller.index");
    router.put("/update/:id", "#controllers/certificate_health_item/setting_certificate_health_item_controller.update");
    router.put(
      "/change-status/:id",
      "#controllers/certificate_health_item/setting_certificate_health_item_controller.changeStatus"
    );
    router.post("/store", "#controllers/certificate_health_item/setting_certificate_health_item_controller.store");
    router.get("/select", "#controllers/certificate_health_item/setting_certificate_health_item_controller.select");
  })
    .prefix('certificate-health-item')
    .middleware(auth);



  router.group(() => {
    router.get("/", "#controllers/business/business_salary_controller.index");
    router.post("/store", "#controllers/business/business_salary_controller.store");
    router.put("/update/:id", "#controllers/business/business_salary_controller.update");
    router.put("/change-status/:id", "#controllers/business/business_salary_controller.changeStatus");
    router.get("/select", "#controllers/business/business_salary_controller.select");
  })
    .prefix('setting-business-salary')
    .middleware(auth);

  router.group(() => {
    router.get("/", "#controllers/products/product_controller.index");
    router.post("/store", "#controllers/products/product_controller.store");
    router.put("/update/:id", "#controllers/products/product_controller.update");
    router.put("/change-status/:id", "#controllers/products/product_controller.changeStatus");
    router.post("/findAutoComplete", "#controllers/products/product_controller.findAutoComplete");
    router.get("/show/:id", "#controllers/products/product_controller.show");
    router.delete("/delete/:id", "#controllers/products/product_controller.delete");
    router.delete("/delete/photo/:id", "#controllers/products/product_controller.deletePhoto");
  })
    .prefix(`product`)
    .middleware(auth)

  router.group(() => {
    router.get("/", "#controllers/provider/provider_controller.index");
    router.post("/store", "#controllers/provider/provider_controller.store");
    router.put("/update/:id", "#controllers/provider/provider_controller.update");
    router.put("/change-status/:id", "#controllers/provider/provider_controller.changeStatus");
    router.post("/select", "#controllers/provider/provider_controller.select");
    router.get("/show/:id", "#controllers/provider/provider_controller.show");
    router.get("/find/products/:provider_id", "#controllers/provider/provider_controller.findProductsByProvider");
    router.post("/product/store", "#controllers/provider/provider_controller.storeProduct");
    router.put("/product/update/:product_id", "#controllers/provider/provider_controller.updateProduct");
    router.put("/product/change-status/:product_id", "#controllers/provider/provider_controller.changeStatusProduct");
    router.post("/find/autocomplete", "#controllers/provider/provider_controller.findAutoComplete");
    router.post("/product/find/autocomplete", "#controllers/provider/provider_controller.findProductAutoComplete");
    router.get("/product/show/:product_id", "#controllers/provider/provider_controller.showProduct");
  })
    .prefix(`provider`)
    .middleware(auth)


  router.group(() => {
    router.get("/", "#controllers/bank/account_controller.index")
    router.post("/store", "#controllers/bank/account_controller.store")
    router.put("/update/:id", "#controllers/bank/account_controller.update")
    router.put("/change-status/:id", "#controllers/bank/account_controller.changeStatus")
    router.get("/find/all", "#controllers/bank/account_controller.findAll")
  })
    .prefix('bank')
    .middleware(auth)
  router.group(() => {
    router.get("/", "#controllers/coin/coin_controller.index");
    router.post("/store", "#controllers/coin/coin_controller.store");
    router.put("/update/:id", "#controllers/coin/coin_controller.update");
    router.put("/change-status/:id", "#controllers/coin/coin_controller.changeStatus");
    router.get("/select", "#controllers/coin/coin_controller.select");
  })
    .prefix('coin')
    .middleware(auth)

  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_work_activity_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_work_activity_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_work_activity_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_work_activity_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_work_activity_controller.select");
  })
    .prefix('setting-lic-work-activities')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_occupation_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_occupation_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_occupation_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_occupation_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_occupation_controller.select");
  })
    .prefix('setting-lic-occupations')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_paying_entity_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_paying_entity_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_paying_entity_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_paying_entity_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_paying_entity_controller.select");
  })
    .prefix('setting-lic-paying-entities')
    .middleware([auth]);

  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_type_license_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_type_license_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_type_license_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_type_license_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_type_license_controller.select");
  })
    .prefix('setting-lic-type-licenses')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_compensation_box_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_compensation_box_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_compensation_box_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_compensation_box_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_compensation_box_controller.select");
  })
    .prefix('setting-lic-compensation-box')
    .middleware(auth);
  router.group(() => {
    router.get("/", "#controllers/setting_lics/lic_mutual_controller.index");
    router.post("/store", "#controllers/setting_lics/lic_mutual_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/lic_mutual_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/lic_mutual_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/lic_mutual_controller.select");
  })
    .prefix('setting-lic-mutuals')
    .middleware(auth);


  router.group(() => {
    router.get("/", "#controllers/setting_lics/setting_lic_motive_controller.index");
    router.post("/store", "#controllers/setting_lics/setting_lic_motive_controller.store");
    router.put("/update/:id", "#controllers/setting_lics/setting_lic_motive_controller.update");
    router.put("/change-status/:id", "#controllers/setting_lics/setting_lic_motive_controller.changeStatus");
    router.get("/select", "#controllers/setting_lics/setting_lic_motive_controller.select");
  })
    .prefix('setting-lic-motive')
    .middleware(auth);


  // Schedules
  router.group(() => {
    router.get("/", "#controllers/schedules/setting_schedule_controller.index");
    router.get("/show/:schedule_id", "#controllers/schedules/setting_schedule_controller.show");
    router.post("/store", "#controllers/schedules/setting_schedule_controller.store");
    router.put("/update/:id", "#controllers/schedules/setting_schedule_controller.update");
    router.put("/change-status/:id", "#controllers/schedules/setting_schedule_controller.changeStatus");
    router.get("/select", "#controllers/schedules/setting_schedule_controller.select");
  })
    .prefix('schedule')
    .middleware(auth)

  // Legal Gratifications
  router.group(() => {
    router.get('/', '#controllers/legal_gratifications/setting_legal_gratification_controller.index')
    router.post('/store', '#controllers/legal_gratifications/setting_legal_gratification_controller.store')
    router.put('/update/:id', '#controllers/legal_gratifications/setting_legal_gratification_controller.update')
    router.put('/change-status/:id', '#controllers/legal_gratifications/setting_legal_gratification_controller.changeStatus')
    router.get('/select', '#controllers/legal_gratifications/setting_legal_gratification_controller.select')
  }).prefix('setting-legal-gratification').middleware(auth)

  // Business Employee legacy actions
  router.group(() => {
    router.post('/business/change', '#controllers/business/business_employee_controller.changeBusiness')
    router.post('/business/add-other', '#controllers/business/business_employee_controller.addOtherBusiness')
  }).prefix('business-employee').middleware(auth)

  // Employee protected routes
  router.group(() => {
    router.post('/store', '#controllers/employees/employee_controller.store')
    router.get('/:token/:business_id', '#controllers/employees/employee_controller.show')
    router.put('/update/:id', '#controllers/employees/employee_controller.update')
    router.post('/find-by-identify', '#controllers/employees/employee_controller.findByIdentify')
    router.post('/find-by-id', '#controllers/employees/employee_controller.findById')
    router.post('/find-by-name', '#controllers/employees/employee_controller.findByName')
    router.post('/find-by-last-name-p', '#controllers/employees/employee_controller.findByLastNameP')
    router.put('/delete/photo', '#controllers/employees/employee_controller.deletePhoto')
    router.get('/count/active/:business_id', '#controllers/employees/employee_controller.countActive')
    router.post('/report', '#controllers/employees/employee_controller.report')
    router.post('/inactive', '#controllers/employees/employee_controller.inactive')
    router.post('/reactive', '#controllers/employees/employee_controller.reactive')
    router.post('/find/autocomplete', '#controllers/employees/employee_controller.findAutocomplete')
    router.post('/find/permits', '#controllers/employees/employee_controller.findWorkPermits')
    router.post('/permits/store', '#controllers/employees/employee_controller.storeWorkPermits')
    router.put('/permits/update', '#controllers/employees/employee_controller.updateWorkPermits')
    router.post('/permits/authorize', '#controllers/employees/employee_controller.autorizePermit')
    router.post('/permits/delete-file', '#controllers/employees/employee_controller.deleteFilePermit')
    router.post('/permits/delete-all', '#controllers/employees/employee_controller.deletePermit')
    router.post('/find/license-health', '#controllers/employees/employee_controller.findLicensesHealth')
    router.post('/store/license-health', '#controllers/employees/employee_controller.storeLicenseHealth')
    router.put('/update/license-health/:id', '#controllers/employees/employee_controller.updateLicenseHealth')
    router.delete('/delete/license-health/:id', '#controllers/employees/employee_controller.deleteLicenseHealth')
    router.post('/access/find', '#controllers/employees/employee_controller.findAccess')
    router.post('/access/find-by-empployee', '#controllers/employees/employee_controller.findAccessByEmployeeId')
  }).prefix('employee').middleware(auth)

  // Employee public routes (permits by token)
  router.group(() => {
    router.get('/permits/find-by-token/:token', '#controllers/employees/employee_controller.showWorkPermitByToken')
  }).prefix('employee')

  // Clients (protected)
  router.group(() => {
    router.get('/', '#controllers/clients/client_controller.index')
    router.get('/list', '#controllers/clients/client_controller.clientsList')
    router.post('/store', '#controllers/clients/client_controller.store')
    router.put('/update/:id', '#controllers/clients/client_controller.update')
    router.put('/change-status/:id', '#controllers/clients/client_controller.changeStatus')
    router.post('/findAutoComplete', '#controllers/clients/client_controller.findAutoComplete')
    router.get('/show/:id', '#controllers/clients/client_controller.show')
    router.delete('/delete/photo/:id', '#controllers/clients/client_controller.deletePhoto')
    router.post('/find/params', '#controllers/clients/client_controller.findByParams')
    router.post('/search', '#controllers/clients/client_controller.search')
  }).prefix('client').middleware(auth)
  // Client Web helpers (public endpoints used by web client area)
  router.group(() => {
    router.post('/find-profile', '#controllers/clients/client_controller.finProfileClientById')
    router.post('/delete-file', '#controllers/clients/client_controller.deleteFile')
  }).prefix('client-web')

  // Client Requests
  router.group(() => {
    router.post('/store', '#controllers/client_requests/client_request_controller.store')
    router.post('/find-by-token', '#controllers/client_requests/client_request_controller.findByToken')
    router.post('/find-by-client', '#controllers/client_requests/client_request_controller.findRequestByClientId')
  }).prefix('client-request')


  // Users (protected)
  router.group(() => {
    router.get('/', '#controllers/users/user_controller.index')
    router.post('/store', '#controllers/users/user_controller.store')
    router.put('/update/:id', '#controllers/users/user_controller.update')
    router.put('/update/signature/:id', '#controllers/users/user_controller.updateSignature')
    router.put('/update/photo/:id', '#controllers/users/user_controller.updatePhoto')
    router.delete('/delete/signature/:id', '#controllers/users/user_controller.deleteSignature')
    router.delete('/delete/photo/:id', '#controllers/users/user_controller.deletePhoto')
  }).prefix('user').middleware(auth)


  // Bugets (quotes)
  router.group(() => {
    router.get('/', '#controllers/bugets/buget_controller.index')
    router.post('/store', '#controllers/bugets/buget_controller.store')
    router.get('/:id/observations', '#controllers/bugets/buget_controller.listObservations')
    router.post('/:id/observations', '#controllers/bugets/buget_controller.addObservation')
    router.get('/:id', '#controllers/bugets/buget_controller.show')
    router.post('/find/number', '#controllers/bugets/buget_controller.findByNro')
    router.post('/find/name', '#controllers/bugets/buget_controller.findByNameClient')
    router.post('/find/date', '#controllers/bugets/buget_controller.findByDate')
    router.put('/update/:id', '#controllers/bugets/buget_controller.update')
    router.put('/status/:id', '#controllers/bugets/buget_controller.updateStatus')
    router.put('/change-client/:id', '#controllers/bugets/buget_controller.changeClient')
    router.delete('/delete/:id', '#controllers/bugets/buget_controller.delete')
    router.get('/count/made/:business_id', '#controllers/bugets/buget_controller.countMade')
    router.get('/count/made/year/:business_id', '#controllers/bugets/buget_controller.countMadeYear')
    router.post('/report', '#controllers/bugets/buget_controller.report')
    router.post('/search-items', '#controllers/bugets/buget_controller.searchItems')
    router.group(() => {
      // ...existing budget routes...
      router.put("/reactivate/:id", "#controllers/bugets/buget_controller.reactivate")
    }).prefix('bugets').middleware(auth)
    router.post('/send-email/:id', '#controllers/bugets/buget_controller.sendEmailToClient')
    router.group(() => {
      router.post('/payments', '#controllers/bugets/buget_controller.storePayment')
      router.get('/payments/:id', '#controllers/bugets/buget_controller.showPayment')
      router.put('/payments/:id', '#controllers/bugets/buget_controller.updatePayment')
      router.delete('/payments/:id', '#controllers/bugets/buget_controller.deletePayment')
      router.post('/payments/:id/void', '#controllers/bugets/buget_controller.voidPayment')
    })
  })
    .prefix('buget')
    .middleware(auth)

  // Config routes
  router.group(() => {
    // Ledging Accounts
    router.group(() => {
      router.get('/', '#controllers/ledging_accounts/ledging_account_controller.index')
      router.post('/store', '#controllers/ledging_accounts/ledging_account_controller.store')
      router.get('/show/:id', '#controllers/ledging_accounts/ledging_account_controller.show')
      router.put('/update/:id', '#controllers/ledging_accounts/ledging_account_controller.update')
      router.delete('/delete/:id', '#controllers/ledging_accounts/ledging_account_controller.delete')
      router.get('/select', '#controllers/ledging_accounts/ledging_account_controller.select')
    }).prefix('ledging-accounts')

    // Payment Methods
    router.group(() => {
      router.get('/', '#controllers/payment_methods/payment_method_controller.index')
      router.post('/store', '#controllers/payment_methods/payment_method_controller.store')
      router.get('/show/:id', '#controllers/payment_methods/payment_method_controller.show')
      router.put('/update/:id', '#controllers/payment_methods/payment_method_controller.update')
      router.delete('/delete/:id', '#controllers/payment_methods/payment_method_controller.delete')
      router.get('/select', '#controllers/payment_methods/payment_method_controller.select')
    }).prefix('payment-methods')

    // Payment Document Types
    router.group(() => {
      router.get('/', '#controllers/payment_document_types/payment_document_type_controller.index')
      router.post('/store', '#controllers/payment_document_types/payment_document_type_controller.store')
      router.get('/show/:id', '#controllers/payment_document_types/payment_document_type_controller.show')
      router.put('/update/:id', '#controllers/payment_document_types/payment_document_type_controller.update')
      router.delete('/delete/:id', '#controllers/payment_document_types/payment_document_type_controller.delete')
      router.get('/select', '#controllers/payment_document_types/payment_document_type_controller.select')
    }).prefix('payment-document-types')
  })
    .prefix('config')
    .middleware(auth)

  // Expenses
  router.group(() => {
    router.get('/', '#controllers/expenses/expense_controller.index')
    router.post('/store', '#controllers/expenses/expense_controller.store')
    router.get('/show/:id', '#controllers/expenses/expense_controller.show')
    router.put('/status/:id', '#controllers/expenses/expense_controller.updateStatus')
    router.delete('/delete/:id', '#controllers/expenses/expense_controller.delete')
  })
    .prefix('expenses')
    .middleware(auth)

  // Shopping (protected)
  router.group(() => {
    router.get('/', '#controllers/shoppings/shopping_controller.index')
    router.post('/store', '#controllers/shoppings/shopping_controller.store')
    router.get('/show/:id', '#controllers/shoppings/shopping_controller.show')
    router.post('/find/number', '#controllers/shoppings/shopping_controller.findByNro')
    router.put('/update/:shop_id', '#controllers/shoppings/shopping_controller.update')
    router.post('/authorizer', '#controllers/shoppings/shopping_controller.authorizer')
    router.put('/delete/:shop_id', '#controllers/shoppings/shopping_controller.delete')
    router.put('/update/nro-buget/:id', '#controllers/shoppings/shopping_controller.updateNroBuget')
    router.post('/find/name', '#controllers/shoppings/shopping_controller.findByNameProvider')
    router.post('/find/date', '#controllers/shoppings/shopping_controller.findByDate')
    router.post('/report', '#controllers/shoppings/shopping_controller.report')
    router.get('/share/:id', '#controllers/shoppings/shopping_controller.share')
  })
    .prefix('shopping')
    .middleware(auth)

  // Shopping (public)
  router.group(() => {
    router.get('/details/:token', '#controllers/shoppings/shopping_controller.showByToken')
  })
    .prefix('shopping')

  // Bugets (public)
  router.group(() => {
    router.get('/view/:token/observations', '#controllers/bugets/buget_controller.listObservationsPublic')
    router.post('/:token/observations', '#controllers/bugets/buget_controller.addObservationFromClient')
    router.put('/view/:token/status', '#controllers/bugets/buget_controller.updateStatusPublic')
    router.get('/view/:token', '#controllers/bugets/buget_controller.showPublic')
  })
    .prefix('buget')

  // Booking (protected)
  router.group(() => {
    router.post('/store', '#controllers/booking/booking_controller.store')
    router.get('/:id', '#controllers/booking/booking_controller.show')
    router.post('/find/number', '#controllers/booking/booking_controller.findByNro')
    router.post('/find/status', '#controllers/booking/booking_controller.findByStatus')
    router.post('/find/name', '#controllers/booking/booking_controller.findByName')
    router.post('/find/buget', '#controllers/booking/booking_controller.findByNroBuget')
    router.post('/count/unattended', '#controllers/booking/booking_controller.findCountUnattended')
    router.post('/find/complements', '#controllers/booking/booking_controller.findComplements')
    router.put('/update/:booking_id', '#controllers/booking/booking_controller.update')
  }).prefix('booking').middleware(auth)

  // Dashboard (metrics & pending lists)
  router.group(() => {
    router.post('/indicators', '#controllers/dashboard/dashboard_controller.indicators')
    router.group(() => {
      router.post('/metrics', '#controllers/dashboard/dashboard_controller.budgetsMetrics')
      router.post('/pending', '#controllers/dashboard/dashboard_controller.pendingBudgets')
    }).prefix('budgets')
    router.group(() => {
      router.post('/metrics', '#controllers/dashboard/dashboard_controller.purchaseOrdersMetrics')
      router.post('/pending', '#controllers/dashboard/dashboard_controller.pendingPurchaseOrders')
    }).prefix('shoppings')
  }).prefix('dashboard').middleware(auth)

  // Balances
  router.group(() => {
    router.get('/movements', '#controllers/balances/balances_controller.getMovements')
  }).prefix('balances').middleware(auth)

  // Notifications
  router.group(() => {
    router.get('/types', '#controllers/notifications/notification_types_controller.index')
    router.get('/types/my', '#controllers/notifications/notification_types_controller.my')
    router.post('/types/store', '#controllers/notifications/notification_types_controller.store')
    router.put('/types/update/:id', '#controllers/notifications/notification_types_controller.update')
    router.post('/types/:id/assign', '#controllers/notifications/notification_types_controller.assignUserNotificationTypes')

    router.get('/my', '#controllers/notifications/notifications_controller.my')
    router.post('/store', '#controllers/notifications/notifications_controller.store')
    router.put('/:id/read', '#controllers/notifications/notifications_controller.markRead')
    router.put('/:id/delete', '#controllers/notifications/notifications_controller.delete')
  })
    .prefix('notifications')
    .middleware(auth)

}).prefix('api/v2')
  .where('id', /^[0-9]+$/)
router.get('/', async () => {
  return {
    hello: 'world',
  }
})




