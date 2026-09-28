import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/accounting_providers.dart';
import '../data/accounting_report_dtos.dart';

final _currency = NumberFormat.currency(symbol: 'KES ');

class FinancialReportsScreen extends ConsumerStatefulWidget {
  const FinancialReportsScreen({super.key});

  @override
  ConsumerState<FinancialReportsScreen> createState() => _FinancialReportsScreenState();
}

class _FinancialReportsScreenState extends ConsumerState<FinancialReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Financial Reports'),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Theme.of(context).primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorSize: TabBarIndicatorSize.label,
          tabs: const [
            Tab(text: 'Balance Sheet'),
            Tab(text: 'Income Statement'),
            Tab(text: 'Trial Balance'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _BalanceSheetTab(),
          _IncomeStatementTab(),
          _TrialBalanceTab(),
        ],
      ),
    );
  }
}

class _BalanceSheetTab extends ConsumerWidget {
  const _BalanceSheetTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(balanceSheetProvider(null));

    return reportAsync.when(
      data: (report) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Text(
                'As of: ${report.asOfDate}',
                style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
            _buildSection(context, 'Assets', report.assets, Colors.blue),
            _buildSection(context, 'Liabilities', report.liabilities, Colors.orange),
            _buildSection(context, 'Equity', report.equity, Colors.purple),
            const SizedBox(height: 16),
            Card(
              color: Colors.grey.shade50,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Net Income', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(
                          _currency.format(report.netIncome),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: report.netIncome >= 0 ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Is Balanced?'),
                        Row(
                          children: [
                            Icon(report.balanced ? Icons.check_circle : Icons.warning, color: report.balanced ? Colors.green : Colors.red, size: 20),
                            const SizedBox(width: 4),
                            Text(report.balanced ? 'Yes' : 'No', style: TextStyle(color: report.balanced ? Colors.green : Colors.red, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Center(child: Text('Error: $e')),
    );
  }

  Widget _buildSection(BuildContext context, String title, BalanceSheetSectionDto section, Color themeColor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: BoxDecoration(
              color: themeColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(fontWeight: FontWeight.bold, color: themeColor),
            ),
          ),
          if (section.items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('No accounts', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
            ),
          ...section.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.accountName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          Text(item.accountCode, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontFamily: 'monospace')),
                        ],
                      ),
                    ),
                    Text(_currency.format(item.balance)),
                  ],
                ),
              )),
          const Divider(height: 1),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(_currency.format(section.total), style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _IncomeStatementTab extends ConsumerWidget {
  const _IncomeStatementTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(incomeStatementProvider(IncomeStatementParams()));

    return reportAsync.when(
      data: (report) {
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildIncomeSection(context, 'Revenues', report.revenues, report.totalRevenue, Colors.green),
            _buildIncomeSection(context, 'Expenses', report.expenses, report.totalExpenses, Colors.red),
            const SizedBox(height: 16),
            Card(
              color: report.netIncome >= 0 ? Colors.green.shade50 : Colors.red.shade50,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Net Income', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    Text(
                      _currency.format(report.netIncome),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 20,
                        color: report.netIncome >= 0 ? Colors.green.shade700 : Colors.red.shade700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Center(child: Text('Error: $e')),
    );
  }

  Widget _buildIncomeSection(BuildContext context, String title, List<IncomeStatementAccountBalanceDto> items, double total, Color themeColor) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            decoration: BoxDecoration(
              color: themeColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Text(
              title.toUpperCase(),
              style: TextStyle(fontWeight: FontWeight.bold, color: themeColor),
            ),
          ),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('No accounts', style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic)),
            ),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.accountName, style: const TextStyle(fontWeight: FontWeight.w500)),
                          Text(item.accountCode, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontFamily: 'monospace')),
                        ],
                      ),
                    ),
                    Text(_currency.format(item.balance)),
                  ],
                ),
              )),
          const Divider(height: 1),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(_currency.format(total), style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TrialBalanceTab extends ConsumerWidget {
  const _TrialBalanceTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportAsync = ref.watch(trialBalanceProvider(null));

    return reportAsync.when(
      data: (report) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(
                'As of: ${report.asOfDate}',
                style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.bold),
              ),
            ),
            Expanded(
              child: ListView.separated(
                itemCount: report.lines.length,
                separatorBuilder: (context, index) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final line = report.lines[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(line.accountName, style: const TextStyle(fontWeight: FontWeight.w600)),
                              const SizedBox(height: 2),
                              Text('${line.accountCode} • ${line.accountType}', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('Dr', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                              Text(_currency.format(line.totalDebits), style: const TextStyle(fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('Cr', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                              Text(_currency.format(line.totalCredits), style: const TextStyle(fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Container(
              color: Colors.grey.shade100,
              padding: const EdgeInsets.all(20),
              child: SafeArea(
                top: false,
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Grand Totals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('Debits', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                                Text(_currency.format(report.grandTotalDebits), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              ],
                            ),
                            const SizedBox(width: 16),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text('Credits', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                                Text(_currency.format(report.grandTotalCredits), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Icon(report.balanced ? Icons.check_circle : Icons.warning, color: report.balanced ? Colors.green : Colors.red, size: 16),
                        const SizedBox(width: 4),
                        Text(
                          report.balanced ? 'Balanced' : 'Not Balanced',
                          style: TextStyle(color: report.balanced ? Colors.green : Colors.red, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            )
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Center(child: Text('Error: $e')),
    );
  }
}
