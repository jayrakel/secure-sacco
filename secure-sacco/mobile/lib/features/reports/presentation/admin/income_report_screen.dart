import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/report_providers.dart';

class IncomeReportScreen extends ConsumerStatefulWidget {
  const IncomeReportScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<IncomeReportScreen> createState() => _IncomeReportScreenState();
}

class _IncomeReportScreenState extends ConsumerState<IncomeReportScreen> {
  DateTime _fromDate = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _toDate = DateTime.now();

  Future<void> _selectDateRange(BuildContext context) async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _fromDate, end: _toDate),
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final fromStr = _fromDate.toIso8601String().split('T')[0];
    final toStr = _toDate.toIso8601String().split('T')[0];

    final incomeAsync = ref.watch(incomeReportProvider(IncomeReportArgs(fromStr, toStr)));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Income Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDateRange(context),
          ),
        ],
      ),
      body: incomeAsync.when(
        data: (report) {
          return Column(
            children: [
              Container(
                padding: const EdgeInsets.all(24.0),
                width: double.infinity,
                color: Colors.green.shade50,
                child: Column(
                  children: [
                    const Text('Total Income', style: TextStyle(fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(
                      'KES ${report.totalIncome.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.green),
                    ),
                    const SizedBox(height: 8),
                    Text('$fromStr  to  $toStr', style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              Expanded(
                child: report.categories.isEmpty
                    ? const Center(child: Text('No income found in this period.'))
                    : ListView.separated(
                        itemCount: report.categories.length,
                        separatorBuilder: (_, __) => const Divider(),
                        itemBuilder: (context, index) {
                          final cat = report.categories[index];
                          return ListTile(
                            leading: const Icon(Icons.category, color: Colors.green),
                            title: Text(cat.category),
                            trailing: Text(
                              'KES ${cat.amount.toStringAsFixed(2)}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
