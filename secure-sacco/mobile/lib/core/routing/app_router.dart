import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/data/auth_state.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/reset_password_screen.dart';
import '../../features/auth/presentation/activation_screen.dart';
import '../../features/auth/presentation/unauthorized_screen.dart';
import '../../features/auth/presentation/contact_verification_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/profile/presentation/change_password_screen.dart';
import '../../features/profile/presentation/security_settings_screen.dart';
import '../../features/profile/presentation/session_list_screen.dart';
import '../../features/dashboard/presentation/member_dashboard_screen.dart';
import '../../features/staff/presentation/unified_staff_dashboard_screen.dart';
import '../../features/setup/presentation/setup_wizard_screen.dart';
import '../../features/setup/presentation/system_initializing_screen.dart';
import '../../features/setup/data/setup_controller.dart';
import '../../features/setup/data/setup_api.dart';
import '../../features/members/presentation/member_list_screen.dart';
import '../../features/members/presentation/member_detail_screen.dart';
import '../../features/users/presentation/user_list_screen.dart';
import '../../features/users/presentation/user_detail_screen.dart';
import '../../features/users/presentation/create_user_screen.dart';
import '../../features/accounting/presentation/accounting_dashboard_screen.dart';
import '../../features/accounting/presentation/chart_of_accounts_screen.dart';
import '../../features/accounting/presentation/journal_entries_screen.dart';
import '../../features/accounting/presentation/sacco_expenses_screen.dart';
import '../../features/accounting/presentation/reconciliation_screen.dart';
import '../../features/accounting/presentation/financial_reports_screen.dart';
import '../../features/accounting/presentation/financial_year_screen.dart';
import '../../features/assets/presentation/asset_dashboard_screen.dart';
import '../../features/audit/presentation/audit_list_screen.dart';
import '../../features/audit/presentation/sms_list_screen.dart';
import '../../features/dividends/presentation/dividends_dashboard_screen.dart';
import '../../features/dividends/presentation/declare_dividend_screen.dart';
import '../../features/expense_claims/presentation/my_expense_claims_screen.dart';
import '../../features/expense_claims/presentation/submit_expense_claim_screen.dart';
import '../../features/expense_claims/presentation/admin_expense_claims_screen.dart';
import '../../features/loans/presentation/my_loans_screen.dart';
import '../../features/loans/presentation/apply_loan_screen.dart';
import '../../features/loans/presentation/my_loan_detail_screen.dart';
import '../../features/loans/presentation/admin/loan_products_screen.dart';
import '../../features/loans/presentation/admin/create_edit_loan_product_screen.dart';
import '../../features/loans/presentation/admin/loan_management_screen.dart';
import '../../features/loans/presentation/admin/staff_loan_detail_screen.dart';
import '../../features/loans/data/loan_dto.dart';
import '../../features/meetings/presentation/my_meetings_screen.dart';
import '../../features/meetings/presentation/meeting_qr_scanner_screen.dart';
import '../../features/meetings/presentation/meeting_check_in_screen.dart';
import '../../features/meetings/presentation/admin/meetings_management_screen.dart';
import '../../features/meetings/presentation/admin/meeting_attendance_screen.dart';
import '../../features/obligations/presentation/admin/obligation_compliance_screen.dart';
import '../../features/obligations/presentation/admin/create_obligation_screen.dart';
import '../../features/obligations/presentation/member/my_obligations_screen.dart';
import '../../features/payment_products/presentation/admin/admin_payment_products_screen.dart';
import '../../features/payment_products/presentation/admin/create_payment_product_screen.dart';
import '../../features/payment_products/presentation/admin/admin_product_transactions_screen.dart';
import '../../features/payment_products/presentation/member/member_split_deposit_screen.dart';
import '../../features/payment_products/presentation/member/member_deposit_history_screen.dart';
import '../../features/penalties/presentation/member/my_penalties_screen.dart';
import '../../features/penalties/presentation/admin/penalty_management_screen.dart';
import '../../features/reports/presentation/member/my_statement_screen.dart';
import '../../features/reports/presentation/member/my_summary_screen.dart';
import '../../features/reports/presentation/admin/reports_hub_screen.dart';
import '../../features/reports/presentation/admin/daily_collections_screen.dart';
import '../../features/reports/presentation/admin/loan_arrears_report_screen.dart';
import '../../features/reports/presentation/admin/income_report_screen.dart';
import '../../features/reports/presentation/admin/general_statement_screen.dart';
import '../../features/reports/presentation/admin/payment_lookup_screen.dart';
import '../../features/roles/presentation/admin/roles_management_screen.dart';
import '../../features/settings/presentation/admin/sacco_settings_screen.dart';
import '../../features/savings/presentation/member/my_savings_screen.dart';
import '../../features/savings/presentation/admin/savings_management_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);
  final setupStateAsync = ref.watch(setupControllerProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.uri.path == '/login';
      final isOtp = state.uri.path == '/otp';
      final isAuthFlow = state.uri.path.startsWith('/auth/');
      
      switch (authState.status) {
        case AuthStatus.initial:
        case AuthStatus.unauthenticated:
          return (isLoggingIn || isOtp || isAuthFlow) ? null : '/login';

        case AuthStatus.requiresMfa:
          return isOtp ? null : '/otp';

        case AuthStatus.requiresContactVerification:
          // The user is logged in but must verify their email/phone first
          return state.uri.path == '/auth/verify-contact' ? null : '/auth/verify-contact';

        case AuthStatus.authenticated:
          if (authState.mustChangePassword && state.uri.path != '/profile/change-password') {
            return '/profile/change-password';
          }

          // FIX: If authenticated and on the login/otp page, redirect away immediately
          // regardless of whether setup state is still loading. This prevents the
          // freeze where the login page stays visible while awaiting the setup API.
          final isOnAuthPage = isLoggingIn || isOtp || state.uri.path == '/';

          // Determine target dashboard (needed for both immediate redirect and later checks)
          final roles = authState.roles;
          final permissions = authState.permissions;
          String targetDashboard = '/unauthorized';

          final isMemberOnly = permissions.contains('MEMBER_DASHBOARD_VIEW') &&
              !permissions.any((p) => [
                    'MEMBERS_READ',
                    'SAVINGS_READ',
                    'LOANS_READ',
                    'ACCOUNTING_READ',
                    'REPORTS_READ',
                    'SAVINGS_MANUAL_POST',
                  ].contains(p)) &&
              !roles.contains('ROLE_SYSTEM_ADMIN');

          if (isMemberOnly) {
            targetDashboard = '/member-dashboard';
          } else if (roles.contains('ROLE_SYSTEM_ADMIN') || permissions.isNotEmpty) {
            targetDashboard = '/staff-dashboard';
          }

          // If still on login/otp, redirect right away — don't wait for setup state
          if (isOnAuthPage || state.uri.path == '/unauthorized') {
            return targetDashboard;
          }

          // Now wait for setup state to load (only for non-login pages)
          if (setupStateAsync.isLoading) return null;

          if (setupStateAsync.hasValue) {
            final setupState = setupStateAsync.value!;
            if (!setupState.complete) {
               if (roles.contains('ROLE_SYSTEM_ADMIN')) {
                 if (state.uri.path != '/setup') return '/setup';
                 return null;
               } else {
                 if (state.uri.path != '/system-initializing') return '/system-initializing';
                 return null;
               }
            }
          }

          // Setup is complete — block access to setup screens
          if (state.uri.path == '/setup' || state.uri.path == '/system-initializing') {
             return '/staff-dashboard';
          }

          // Block verify-contact for already-verified users
          if (state.uri.path == '/auth/verify-contact') {
            return targetDashboard;
          }

          if (roles.contains('ROLE_SYSTEM_ADMIN')) {
             if (state.uri.path.startsWith('/admin') || state.uri.path.startsWith('/accounting') || state.uri.path.startsWith('/assets')) {
              // system admin allowed
            }
          }

          // Basic restriction rules based on paths:
          if ((state.uri.path.startsWith('/admin') && !roles.contains('ROLE_SYSTEM_ADMIN')) ||
              (state.uri.path.startsWith('/accounting') && !(roles.contains('ROLE_SYSTEM_ADMIN') || permissions.contains('ACCOUNTING_READ'))) ||
              (state.uri.path.startsWith('/assets') && !(roles.contains('ROLE_SYSTEM_ADMIN') || permissions.contains('ASSETS_READ'))) ||
              (state.uri.path.startsWith('/member') && !roles.contains('ROLE_MEMBER'))) {
            return targetDashboard;
          }

          return null;
      }
    },
    routes: [
      ShellRoute(
        builder: (context, state, child) => SelectionArea(child: child),
        routes: [
          GoRoute(
            path: '/login',
            builder: (context, state) => const LoginScreen(),
          ),
          GoRoute(
            path: '/setup',
            builder: (context, state) => const SetupWizardScreen(),
          ),
          GoRoute(
            path: '/system-initializing',
            builder: (context, state) => const SystemInitializingScreen(),
          ),
      GoRoute(
        path: '/otp',
        builder: (context, state) => const OtpScreen(),
      ),
      GoRoute(
        path: '/unauthorized',
        builder: (context, state) => const UnauthorizedScreen(),
      ),
      GoRoute(
        path: '/auth/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/auth/reset-password',
        builder: (context, state) => const ResetPasswordScreen(),
      ),
      GoRoute(
        path: '/auth/activate',
        builder: (context, state) => const ActivationScreen(),
      ),
      GoRoute(
        path: '/auth/verify-contact',
        builder: (context, state) {
          // When the user clicks the email verification link, the backend sends them
          // to /verify-contact?type=email&token=<uuid>. We pass the token to the
          // screen so it can auto-confirm on load.
          final emailToken = state.uri.queryParameters['type'] == 'email'
              ? state.uri.queryParameters['token']
              : null;
          return ContactVerificationScreen(emailToken: emailToken);
        },
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
        routes: [
          GoRoute(
            path: 'change-password',
            builder: (context, state) => const ChangePasswordScreen(),
          ),
          GoRoute(
            path: 'security',
            builder: (context, state) => const SecuritySettingsScreen(),
          ),
          GoRoute(
            path: 'sessions',
            builder: (context, state) => const SessionListScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/member-dashboard',
        builder: (context, state) => const DashboardScreen(), // Imported as DashboardScreen
      ),
      GoRoute(
        path: '/member/expense-claims',
        builder: (context, state) => const MyExpenseClaimsScreen(),
        routes: [
          GoRoute(
            path: 'submit',
            builder: (context, state) => const SubmitExpenseClaimScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/member/obligations',
        builder: (context, state) => const MyObligationsScreen(),
      ),
      GoRoute(
        path: '/member/penalties',
        builder: (context, state) => const MyPenaltiesScreen(),
      ),
      GoRoute(
        path: '/member/reports/summary',
        builder: (context, state) => const MySummaryScreen(),
      ),
      GoRoute(
        path: '/member/reports/statement',
        builder: (context, state) => const MyStatementScreen(),
      ),
      GoRoute(
        path: '/member/deposits',
        builder: (context, state) => const MemberDepositHistoryScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const MemberSplitDepositScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/member/loans',
        builder: (context, state) => const MyLoansScreen(),
        routes: [
          GoRoute(
            path: 'apply',
            builder: (context, state) => const ApplyLoanScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return MyLoanDetailScreen(applicationId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/member/meetings',
        builder: (context, state) => const MyMeetingsScreen(),
        routes: [
          GoRoute(
            path: 'scanner',
            builder: (context, state) {
              final meetingId = state.extra as String;
              return MeetingQrScannerScreen(meetingId: meetingId);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/meetings/checkin/:token',
        builder: (context, state) {
          final token = state.pathParameters['token']!;
          return MeetingCheckInScreen(token: token);
        },
      ),
      GoRoute(
        path: '/member/savings',
        builder: (context, state) => const MySavingsScreen(),
      ),
      GoRoute(
        path: '/staff-dashboard',
        builder: (context, state) => const UnifiedStaffDashboardScreen(),
      ),
      GoRoute(
        path: '/admin/members',
        builder: (context, state) => const MemberListScreen(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return MemberDetailScreen(memberId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/admin/users',
        builder: (context, state) => const UserListScreen(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) => const CreateUserScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return UserDetailScreen(userId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/admin/audit',
        builder: (context, state) => const AuditListScreen(),
      ),
      GoRoute(
        path: '/admin/sms-logs',
        builder: (context, state) => const SmsListScreen(),
      ),
      GoRoute(
        path: '/admin/obligations/compliance',
        builder: (context, state) => const ObligationComplianceScreen(),
      ),
      GoRoute(
        path: '/admin/penalties',
        builder: (context, state) => const PenaltyManagementScreen(),
      ),
      GoRoute(
        path: '/admin/roles',
        builder: (context, state) => const RolesManagementScreen(),
      ),
      GoRoute(
        path: '/admin/savings',
        builder: (context, state) => const SavingsManagementScreen(),
      ),
      GoRoute(
        path: '/admin/settings',
        builder: (context, state) => const SaccoSettingsScreen(),
      ),
      GoRoute(
        path: '/admin/reports',
        builder: (context, state) => const ReportsHubScreen(),
        routes: [
          GoRoute(
            path: 'daily-collections',
            builder: (context, state) => const DailyCollectionsScreen(),
          ),
          GoRoute(
            path: 'loan-arrears',
            builder: (context, state) => const LoanArrearsReportScreen(),
          ),
          GoRoute(
            path: 'income',
            builder: (context, state) => const IncomeReportScreen(),
          ),
          GoRoute(
            path: 'general-statement',
            builder: (context, state) => const GeneralStatementScreen(),
          ),
          GoRoute(
            path: 'payment-lookup',
            builder: (context, state) => const PaymentLookupScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/admin/obligations/new',
        builder: (context, state) => const CreateObligationScreen(),
      ),
      GoRoute(
        path: '/admin/payment-products',
        builder: (context, state) => const AdminPaymentProductsScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const CreatePaymentProductScreen(),
          ),
          GoRoute(
            path: ':id/transactions',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return AdminProductTransactionsScreen(productId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/admin/dividends',
        builder: (context, state) => const DividendsDashboardScreen(),
        routes: [
          GoRoute(
            path: 'declare',
            builder: (context, state) => const DeclareDividendScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/admin/expense-claims',
        builder: (context, state) => const AdminExpenseClaimsScreen(),
      ),
      GoRoute(
        path: '/admin/loans',
        builder: (context, state) => const LoanManagementScreen(),
        routes: [
          GoRoute(
            path: 'products',
            builder: (context, state) => const LoanProductsScreen(),
            routes: [
              GoRoute(
                path: 'create',
                builder: (context, state) => const CreateEditLoanProductScreen(),
              ),
              GoRoute(
                path: 'edit',
                builder: (context, state) {
                  final product = state.extra as LoanProduct?;
                  return CreateEditLoanProductScreen(existingProduct: product);
                },
              ),
            ],
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              if (id == 'products') return const LoanProductsScreen(); // handle strict matching just in case
              return StaffLoanDetailScreen(applicationId: id);
            },
          ),
        ],
      ),
      GoRoute(
        path: '/admin/meetings',
        builder: (context, state) => const MeetingsManagementScreen(),
        routes: [
          GoRoute(
            path: ':id/attendance',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return MeetingAttendanceScreen(meetingId: id);
            },
          ),
        ],
      ),
      
      
      
      
      
      GoRoute(
        path: '/accounting',
        builder: (context, state) => const AccountingDashboardScreen(),
        routes: [
          GoRoute(
            path: 'chart-of-accounts',
            builder: (context, state) => const ChartOfAccountsScreen(),
          ),
          GoRoute(
            path: 'journal-entries',
            builder: (context, state) => const JournalEntriesScreen(),
          ),
          GoRoute(
            path: 'expenses',
            builder: (context, state) => const SaccoExpensesScreen(),
          ),
          GoRoute(
            path: 'reconciliation',
            builder: (context, state) => const ReconciliationScreen(),
          ),
          GoRoute(
            path: 'reports',
            builder: (context, state) => const FinancialReportsScreen(),
          ),
          GoRoute(
            path: 'financial-years',
            builder: (context, state) => const FinancialYearScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/assets',
        builder: (context, state) => const AssetDashboardScreen(),
      ),
    ], // end of ShellRoute routes
  ), // end of ShellRoute
], // end of root routes
  );
});

