import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/report_providers.dart';

class GeneralStatementScreen extends ConsumerStatefulWidget {
  const GeneralStatementScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<GeneralStatementScreen> createState() => _GeneralStatementScreenState();
}

class _GeneralStatementScreenState extends ConsumerState<GeneralStatementScreen> {
  DateTime? _fromDate;
  DateTime? _toDate;
  String? _accountCode;
  
  final _searchController = TextEditingController();

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

  void _clearFilters() {
    setState(() {
      _fromDate = null;
      _toDate = null;
      _accountCode = null;
      _searchController.clear();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fromStr = _fromDate?.toIso8601String().split('T')[0];
    final toStr = _toDate?.toIso8601String().split('T')[0];

    final statementAsync = ref.watch(generalStatementProvider(
      GeneralStatementArgs(from: fromStr, to: toStr, accountCode: _accountCode),
    ));

    return Scaffold(
      appBar: AppBar(
        title: const Text('General Statement (Ledger)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.date_range),
            onPressed: () => _selectDateRange(context),
          ),
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: _clearFilters,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                labelText: 'Filter by Account Code',
                prefixIcon: const Icon(Icons.search),
                border: const OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.check),
                  onPressed: () {
                    setState(() {
                      _accountCode = _searchController.text.trim();
                      if (_accountCode!.isEmpty) _accountCode = null;
                    });
                  },
                ),
              ),
              onSubmitted: (value) {
                setState(() {
                  _accountCode = value.trim();
                  if (_accountCode!.isEmpty) _accountCode = null;
                });
              },
            ),
          ),
          Expanded(
            child: statementAsync.when(
              data: (data) {
                return Column(
                  children: [
                    Container(
                      color: Colors.grey.shade200,
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total DR: ${data.totalDebits.toStringAsFixed(2)}', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                          Text('Total CR: ${data.totalCredits.toStringAsFixed(2)}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          columnSpacing: 20,
                          columns: const [
                            DataColumn(label: Text('Date')),
                            DataColumn(label: Text('Ref')),
                            DataColumn(label: Text('Description')),
                            DataColumn(label: Text('Account')),
                            DataColumn(label: Text('Type')),
                            DataColumn(label: Text('Debit', style: TextStyle(color: Colors.red))),
                            DataColumn(label: Text('Credit', style: TextStyle(color: Colors.green))),
                            DataColumn(label: Text('Balance')),
                          ],
                          rows: data.lines.map((line) {
                            return DataRow(cells: [
                              DataCell(Text(line.transactionDate)),
                              DataCell(Text(line.reference)),
                              DataCell(Text(line.description)),
                              DataCell(Text('${line.accountName}\n(${line.accountCode})')),
                              DataCell(Text(line.accountType)),
                              DataCell(Text(line.debitAmount > 0 ? line.debitAmount.toStringAsFixed(2) : '')),
                              DataCell(Text(line.creditAmount > 0 ? line.creditAmount.toStringAsFixed(2) : '')),
                              DataCell(Text(line.runningBalance.toStringAsFixed(2))),
                            ]);
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
    );
  }
}
