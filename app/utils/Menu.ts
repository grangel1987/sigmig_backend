class Menu {
    public static getMenu(permissionsGlobal: any[] = [], isSuperAdmin = false) {
        let menu: MenuBody[] = [
            {
                header: 'dashboard',
                id: 1,
                children: [
                    {//start
                        title: 'Starter Page',
                        icon: 'widget-add-line-duotone',
                        to: '/',
                        permission: 'none',
                    },
                ]
            },
            {
                header: 'people',
                id: 2,
                children: [
                    {//usuarios
                        title: 'users',
                        icon: 'users-group-two-rounded-bold-duotone',
                        to: '/2level',
                        children: [
                            {
                                title: 'rols',
                                to: '/users/rols',
                                permission: 'admin_rols',
                            },
                            {
                                title: 'adminUser',
                                to: '/users/users',
                                permission: 'admin_users',
                            }
                        ]
                    },
                    {//clientes
                        title: 'clients',
                        icon: 'user-check-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'newClient',
                                to: '/clients/newClient',
                                permission: 'create_client',
                            },
                            {
                                title: 'adminClient',
                                to: '/clients/adminClient',
                                permission: 'admin_client',
                            }
                        ]
                    },
                    {//personal
                        title: 'employees',
                        icon: 'delivery-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'newEmployee',
                                to: '/newEmployee',
                                permission: 'create_employee',
                            },
                            {
                                title: 'adminEmployee',
                                to: '/adminEmployee',
                                permission: 'admin_employee',
                            }
                        ]
                    }
                ]
            },
            {
                header: 'administration',
                id: 3,
                children: [
                    {// cotizaciones
                        title: 'budget',
                        icon: 'document-add-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'newBudget',
                                to: '/budget/new',
                                permission: 'create_budget',
                            },
                            {
                                title: 'adminBudget',
                                to: '/budget/admin',
                                permission: 'admin_budget',
                            }
                        ]
                    },
                    {//compras
                        title: 'shopping',
                        icon: 'document-add-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'newShopping',
                                to: '/newShopping',
                                permission: 'create_shopping',
                            },
                            {
                                title: 'adminShopping',
                                to: '/adminShopping',
                                permission: 'admin_shopping',
                            }

                        ]
                    },
                    {//proveedores
                        title: 'providers',
                        icon: 'delivery-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'providers',
                                to: '/providers',
                                permission: 'admin_providers',
                            }
                        ]
                    },
                    {
                        title: 'products',
                        icon: 'box-outline',
                        to: '/2level',
                        children: [
                            {
                                title: 'adminProducts',
                                to: '/products',
                                permission: 'admin_products',
                            }
                        ]
                    }
                ]
            },

            {
                header: 'bookings',
                id: 4,
                children: [
                    {//reservas
                        title: 'bookings',
                        icon: 'calendar-check-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'newBooking',
                                to: '/newBooking',
                                permission: 'create_booking',
                            },
                            {
                                title: 'adminBooking',
                                to: '/adminBooking',
                                permission: 'admin_booking',
                            }
                        ]
                    },
                ]
            },

            {
                header: 'report',
                id: 5,
                children: [
                    {//reportes
                        title: 'reports',
                        icon: 'document-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'report-employee',
                                to: '/report-employee',
                                permission: 'report_employee',
                            },
                            {
                                title: 'report-buget',
                                to: '/report-buget',
                                permission: 'report_buget',
                            },
                            {
                                title: 'report-access',
                                to: '/report-access',
                                permission: 'report_access',
                            }
                        ]
                    },
                ]
            },
            {
                header: 'config',
                id: 6,
                children: [
                    {
                        title: 'general',
                        icon: 'settings-bold',
                        to: '/2level',
                        children: [
                            {
                                title: 'countries',
                                to: '/settings/general/countries',
                                permission: 'setting_countries',
                            },
                            {
                                title: 'cities',
                                to: '/settings/general/cities',
                                permission: 'setting_cities',
                            },
                            {
                                title: 'business',
                                to: '/settings/general/business',
                                permission: 'setting_business',
                            },
                            {
                                title: 'cost-center',
                                to: '/settings/general/cost-center',
                                permission: 'setting_cost_center',
                            },
                            {
                                title: 'works',
                                to: '/settings/general/works',
                                permission: 'setting_works',
                            },
                            {
                                title: 'positions',
                                to: '/settings/general/positions',
                                permission: 'setting_positions',
                            }
                        ]
                    },
                    {
                        title: 'budget',
                        icon: 'document-add-outline',
                        to: '/2level',
                        children: [
                            {
                                title: 'budget-categories',
                                to: '/settings/budget/budget-categories',
                                permission: 'setting_budget_categories',
                            },
                            {
                                title: 'budget-items',
                                to: '/settings/budget/budget-items',
                                permission: 'setting_budget_items',
                            }
                        ]
                    },
                    {
                        title: 'financial',
                        icon: 'banknote-2-broken',
                        to: '/2level',
                        children: [
                            {
                                title: 'banks',
                                to: '/settings/financial/banks',
                                permission: 'setting_banks',
                            },
                            {
                                title: 'coins',
                                to: '/settings/financial/coins',
                                permission: 'setting_coins',
                            }
                        ]
                    },
                    {
                        title: 'properties',
                        icon: 'buildings-2-bold',
                        to: '/2level',
                        children: [
                            {
                                title: 'booking-properties',
                                to: '/settings/properties/booking-properties',
                                permission: 'setting_booking_properties',
                            },
                            {
                                title: 'bookingItems',
                                to: '/settings/properties/booking-items',
                                permission: 'setting_booking_items',
                            },
                            {
                                title: 'bookingNotes',
                                to: '/settings/properties/booking-notes',
                                permission: 'setting_booking_notes',
                            }
                        ]
                    },
                    {
                        title: 'lic-work',
                        icon: 'document-medicine-line-duotone',
                        to: '/2level',
                        children: [
                            {
                                title: 'workActivities',
                                to: '/settings/lic-work/activities',
                                permission: 'setting_work_activities',

                            },
                            {
                                title: 'licOccupations',
                                to: '/settings/lic-work/occupationss',
                                permission: 'setting_lic_occupations',
                            },
                            {
                                title: 'licPayingEntities',
                                to: '/settings/lic-work/paying-entities',
                                permission: 'setting_lic_paying_entities',
                            },
                            {
                                title: 'typeLicenses',
                                to: '/settings/lic-work/type-licences',
                                permission: 'setting_type_licenses',
                            },
                            {
                                title: 'licCompensations',
                                to: '/settings/lic-work/compensation-box',
                                permission: 'setting_lic_compensations',
                            },
                            {
                                title: 'licMutual',
                                to: '/settings/lic-work/mutual',
                                permission: 'setting_lic_mutual',
                            },
                            {
                                title: 'licMotive',
                                to: '/settings/lic-work/motive',
                                permission: 'setting_lic_motive',
                            }
                        ]
                    },
                    {
                        title: 'remuneration',
                        icon: 'hand-money-outline',
                        to: '/2level',
                        children: [
                            {
                                title: 'discounts',
                                to: '/settings/remuneration/discounts',
                                permission: 'setting_remuneration_discounts',
                            },
                            {
                                title: 'assets',
                                to: '/settings/remuneration/assets',
                                permission: 'setting_remuneration_assets',
                            },
                            {
                                title: 'afp',
                                to: '/settings/remuneration/afp',
                                permission: 'setting_remuneration_afp',
                            },
                            {
                                title: 'exRegimen',
                                to: '/settings/remuneration/exRegimens',
                                permission: 'setting_remuneration_exRegimen',
                            },
                            {
                                title: 'isapres',
                                to: '/settings/remuneration/isapres',
                                permission: 'setting_remuneration_isapres',
                            },
                            {
                                title: 'layoffs',
                                to: '/settings/remuneration/layoffs',
                                permission: 'setting_remuneration_layoffs',
                            },
                            {
                                title: 'affiliations',
                                to: '/settings/remuneration/affiliations',
                                permission: 'setting_remuneration_affiliations',
                            },
                            {
                                title: 'typeContracts',
                                to: '/settings/remuneration/typeContracts',
                                permission: 'setting_remuneration_typeContracts',
                            },
                            {
                                title: 'loadFamilies',
                                to: '/settings/remuneration/loadFamilies',
                                permission: 'setting_remuneration_loadFamilies',
                            },
                            {
                                title: 'businessSalaries',
                                to: '/settings/remuneration/businessSalaries',
                                permission: 'setting_remuneration_businessSalaries',
                            },
                            {
                                title: 'certificateHealthItems',
                                to: '/settings/remuneration/certificateHealthItems',
                                permission: 'setting_remuneration_certificateHealthItems',
                            }
                        ]
                    }
                ]
            }
        ];

        function initializeEnabled(items: MenuItem[], isSuperAdmin = false): void {
            items.forEach(item => {
                item.enabled ??= false || isSuperAdmin; // Default false
                if (item.children) {
                    initializeEnabled(item.children);
                }
            });
        }

        initializeEnabled(menu.flatMap(m => m.children).flatMap(c => c.children || [c]), isSuperAdmin);

        if (isSuperAdmin) return menu;


        function applyPermissions(items: MenuItem[], permissions: string[]): void {
            items.forEach(item => {
                const hasPermission = item.permission === 'none' || permissions.includes(item.permission!);
                item.enabled = hasPermission;

                if (item.children) {
                    applyPermissions(item.children, permissions);
                }
            });
        }

        // Apply to all levels
        menu.forEach(main => {
            applyPermissions(main.children, permissionsGlobal);
            main.enabled = main.children.some(child => child.enabled);
        });


        //elimino los items que no esten habilitados y los que no tengan hijos habilitados
        function filterMenuItems(items: MenuItem[]): MenuItem[] {
            return items
                .map(item => {
                    if (item.children) {
                        item.children = filterMenuItems(item.children);
                    }
                    return item;
                })
                .filter(item =>
                    item.enabled !== false &&
                    (!item.children || item.children.length > 0)
                );
        }

        return menu
            .map(main => ({ ...main, children: filterMenuItems(main.children) }))
            .filter(main => main.children.length > 0);
    }
}

export default Menu;




interface MenuItem {
    title?: string;
    icon?: string;
    to: string;
    permission?: string;
    enabled?: boolean;
    children?: MenuItem[];
}

interface MenuBody {
    header: string;
    id: number;
    enabled?: boolean;
    children: MenuItem[];
}