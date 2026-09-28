import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/data/auth_state.dart';
import '../../data/report_providers.dart';

class MyStatementScreen extends ConsumerStatefulWidget {
  const MyStatementScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<MyStatementScreen> createState() => _MyStatementScreenState();
}

class _MyStatementScreenState extends ConsumerState<MyStatementScreen> {
  DateTime? _fromDate;
  DateTime? _toDate;

  Future<void> _selectDateRange(BuildContext context) async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _fromDate != null && _toDate != null
          ? DateTimeRange(start: _fromDate!, end: _toDate!)
          : null,
    );
    if (picked != null) {
      setState(() {
        _fromDate = picked.start;
        _toDate = picked.end;
      });
    }
  }

  void _clearDates() {
    setState(() {
      _fromDate = null;
      _toDate = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final memberId = ref.watch(authControllerProvider).memberId;

    if (memberId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Statement')),
        body: const Center(child: Text('No member ID available.')),
      );
    }

    final fromStr = _fromDate?.toIso8601String().split('T')[0];
    final toStr = _toDate?.toIso8601String().split('T')[0];
    
    final statementAsync = ref.watch(memberStatementProvider(MemberStatementArgs(memberId, from: fromStr, to: toStr)));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Statement'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDateRange(context),
          ),
          if (_fromDate != null || _toDate != null)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: _clearDates,
            ),
        ],
      ),
      body: statementAsync.when(
        data: (data) {
          final summary = data.summary;
          final items = data.items;

          return Column(
            children: [
              _buildSummaryHeader(summary),
              const Divider(thickness: 2),
              if (items.isEmpty)
                const Expanded(
                  child: Center(child: Text('No transactions found.')),
                )
              else
                Expanded(
                  child: ListView.separated(
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (context, index) {
                      final item = items[index];
                      final isCredit = item.amount > 0;
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: isCredit ? Colors.green.withOpacity(0.2) : Colors.red.withOpacity(0.2),
                          child: Icon(
                            isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                            color: isCredit ? Colors.green : Colors.red,
                          ),
                        ),
                        title: Text(item.description),
                        subtitle: Text('${item.date}\nRef: ${item.reference}'),
                        trailing: Text(
                          'KES ${item.amount.abs().toStringAsFixed(2)}',
                          style: TextStyle(
                            color: isCredit ? Colors.green : Colors.red,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        isThreeLine: true,
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

  Widget _buildSummaryHeader(dynamic summary) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildMiniStat('Savings In', summary.savingsDeposited, Colors.green)),
              Expanded(child: _buildMiniStat('Savings Out', summary.savingsWithdrawn, Colors.red)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _buildMiniStat('Loan Out', summary.loanOutstanding, Colors.orange)),
              Expanded(child: _buildMiniStat('Penalties', summary.penaltiesOutstanding, Colors.purple)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, double value, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(
              value.toStringAsFixed(0),
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
