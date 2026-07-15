// Physical table names for @fayz-ai/courses. Renamed to the plg_courses_*
// industry-pool prefix (was course_*) when the core DB moved into the public
// schema. RPC function names (course_place_order, course_confirm_payment) are
// unchanged.
export const T = {
  courses: 'plg_courses_courses',
  modules: 'plg_courses_modules',
  lessons: 'plg_courses_lessons',
  offers: 'plg_courses_offers',
  customers: 'plg_courses_customers',
  enrollments: 'plg_courses_enrollments',
  progress: 'plg_courses_progress',
  orders: 'plg_courses_orders',
  subscriptions: 'plg_courses_subscriptions',
  creatorAccounts: 'plg_courses_creator_accounts',
  payouts: 'plg_courses_payouts',
  paymentEvents: 'plg_courses_payment_events',
} as const
