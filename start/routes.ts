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
    router.get("find-user-by-token", "#controllers/users/user_controller.findByToken")
    router.post("login", "#controllers/users/user_controller.login")
    router.post("/forgot-password", "#controllers/users/user_controller.forgotPassword");
    router.post("/change-password-forgot", "#controllers/users/user_controller.changePasswordForgot");
    router.post("/client/login", "#controllers/users/user_controller.loginClient");
  }).prefix('account')

  router.group(() => {
    router.get("country/:id", "#controllers/settings/setting_controller.findSettingsByCountry")
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



  "use strict";

  /*
  |--------------------------------------------------------------------------
  | City Routes
  |--------------------------------------------------------------------------
  */



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






}).prefix('api/v2')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
