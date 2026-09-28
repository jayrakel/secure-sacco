import 'package:flutter/material.dart';
import '../../admin/presentation/widgets/admin_drawer.dart';
import 'chart_of_accounts_screen.dart';
import 'journal_entries_screen.dart';
import 'financial_reports_screen.dart';
import 'reconciliation_screen.dart';
import 'financial_year_screen.dart';
import 'sacco_expenses_screen.dart';

class AccountingDashboardScreen extends StatelessWidget {
  const AccountingDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      drawer: const AdminDrawer(),
      appBar: AppBar(
        title: const Text('Accounting'),
        centerTitle: true,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        children: [
          _buildSectionHeader(context, 'Core Ledgers'),
          _buildActionCard(
            context: context,
            title: 'Chart of Accounts',
            subtitle: 'Manage ASSET, LIABILITY, EQUITY accounts',
            icon: Icons.account_balance_wallet,
            color: Colors.blue,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChartOfAccountsScreen())),
          ),
          _buildActionCard(
            context: context,
            title: 'Journal Entries',
            subtitle: 'View and post manual GL entries',
            icon: Icons.menu_book,
            color: Colors.indigo,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const JournalEntriesScreen())),
          ),
          
          const SizedBox(height: 24),
          _buildSectionHeader(context, 'Operations'),
          _buildActionCard(
            context: context,
            title: 'Operating Expenses',
            subtitle: 'Record and track Sacco expenses',
            icon: Icons.receipt_long,
            color: Colors.teal,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SaccoExpensesScreen())),
          ),
          _buildActionCard(
            context: context,
            title: 'Bank Reconciliation',
            subtitle: 'Internal checks and statement uploads',
            icon: Icons.compare_arrows,
            color: Colors.deepPurple,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReconciliationScreen())),
          ),

          const SizedBox(height: 24),
          _buildSectionHeader(context, 'Reports & Period'),
          _buildActionCard(
            context: context,
            title: 'Financial Reports',
            subtitle: 'Trial Balance, P&L, and Balance Sheet',
            icon: Icons.insights,
            color: Colors.orange,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FinancialReportsScreen())),
          ),
          _buildActionCard(
            context: context,
            title: 'Financial Years',
            subtitle: 'Manage and close accounting periods',
            icon: Icons.calendar_month,
            color: Colors.green,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FinancialYearScreen())),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 12),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Colors.grey.shade600,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
      ),
    );
  }

  Widget _buildActionCard({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      color: Colors.white,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
