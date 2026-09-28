import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/journal_entry_dto.dart';
import '../data/accounting_repository.dart';
import 'package:intl/intl.dart';

class PostJournalEntryScreen extends ConsumerStatefulWidget {
  const PostJournalEntryScreen({super.key});

  @override
  ConsumerState<PostJournalEntryScreen> createState() => _PostJournalEntryScreenState();
}

class _LineData {
  String accountCode = '';
  double debit = 0.0;
  double credit = 0.0;
  String? description;
  String? memberId;
}

class _PostJournalEntryScreenState extends ConsumerState<PostJournalEntryScreen> {
  final _formKey = GlobalKey<FormState>();
  final _refCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  DateTime _transactionDate = DateTime.now();
  
  final List<_LineData> _lines = [_LineData(), _LineData()]; // Start with 2 lines minimum
  bool _isLoading = false;

  @override
  void dispose() {
    _refCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _addLine() {
    setState(() {
      _lines.add(_LineData());
    });
  }

  void _removeLine(int index) {
    if (_lines.length > 2) {
      setState(() {
        _lines.removeAt(index);
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('At least 2 lines are required for a journal entry')),
      );
    }
  }

  double get _totalDebits => _lines.fold(0.0, (sum, line) => sum + line.debit);
  double get _totalCredits => _lines.fold(0.0, (sum, line) => sum + line.credit);
  bool get _isBalanced => (_totalDebits - _totalCredits).abs() <= 0.001 && _totalDebits > 0;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    
    // Trigger rebuild to update totals in UI before validating
    setState(() {});

    if (!_isBalanced) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Debits and Credits must balance and be greater than zero!'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final request = CreateJournalEntryRequestDto(
        transactionDate: DateFormat('yyyy-MM-dd').format(_transactionDate.toLocal()),
        referenceNumber: _refCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        lines: _lines.map((l) => JournalEntryLineRequestDto(
          accountCode: l.accountCode,
          debitAmount: l.debit,
          creditAmount: l.credit,
          description: l.description?.isEmpty == true ? null : l.description,
          memberId: l.memberId?.isEmpty == true ? null : l.memberId,
        )).toList(),
      );

      final repo = ref.read(accountingRepositoryProvider);
      await repo.createJournalEntry(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Journal Entry posted successfully')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(symbol: 'KES ');

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.surface,
      appBar: AppBar(
        title: const Text('Post Journal Entry'),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildHeaderFields(),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Entry Lines', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                      ElevatedButton.icon(
                        onPressed: _addLine,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add Line'),
                        style: ElevatedButton.styleFrom(
                          visualDensity: VisualDensity.compact,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ..._lines.asMap().entries.map((entry) => _buildLineCard(entry.key, entry.value)),
                ],
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5)),
                ],
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              const Text('Total Debits', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              Text(currencyFormat.format(_totalDebits), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          Column(
                            children: [
                              const Text('Total Credits', style: TextStyle(color: Colors.grey, fontSize: 12)),
                              Text(currencyFormat.format(_totalCredits), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          Icon(
                            _isBalanced ? Icons.balance : Icons.warning,
                            color: _isBalanced ? Colors.green : Colors.red,
                            size: 28,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        height: 50,
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _isLoading 
                              ? const CircularProgressIndicator(color: Colors.white) 
                              : const Text('Submit Journal Entry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderFields() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            InkWell(
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _transactionDate,
                  firstDate: DateTime(2000),
                  lastDate: DateTime(2100),
                );
                if (date != null) {
                  setState(() => _transactionDate = date);
                }
              },
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Transaction Date *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(DateFormat('yyyy-MM-dd').format(_transactionDate.toLocal())),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _refCtrl,
              decoration: const InputDecoration(
                labelText: 'Reference Number *', 
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.receipt),
              ),
              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                labelText: 'Description *', 
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
              ),
              maxLines: 2,
              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLineCard(int index, _LineData line) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade300),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.indigo.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text('Line ${index + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo.shade700)),
                ),
                if (_lines.length > 2)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: () => _removeLine(index),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              decoration: const InputDecoration(
                labelText: 'GL Account Code *', 
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.account_balance_wallet),
              ),
              validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
              onChanged: (val) => line.accountCode = val,
              onSaved: (val) => line.accountCode = val!,
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(
                      labelText: 'Debit', 
                      border: OutlineInputBorder(),
                      prefixText: 'KES ',
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    initialValue: line.debit == 0.0 ? '' : line.debit.toString(),
                    onChanged: (val) {
                      line.debit = double.tryParse(val) ?? 0.0;
                      setState(() {}); // update totals
                    },
                    onSaved: (val) => line.debit = double.tryParse(val ?? '0') ?? 0.0,
                    validator: (val) {
                      final debit = double.tryParse(val ?? '0') ?? 0.0;
                      if (debit < 0) return 'Invalid';
                      return null;
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(
                      labelText: 'Credit', 
                      border: OutlineInputBorder(),
                      prefixText: 'KES ',
                    ),
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    initialValue: line.credit == 0.0 ? '' : line.credit.toString(),
                    onChanged: (val) {
                      line.credit = double.tryParse(val) ?? 0.0;
                      setState(() {}); // update totals
                    },
                    onSaved: (val) => line.credit = double.tryParse(val ?? '0') ?? 0.0,
                    validator: (val) {
                      final credit = double.tryParse(val ?? '0') ?? 0.0;
                      if (credit < 0) return 'Invalid';
                      return null;
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ExpansionTile(
              title: const Text('Optional Details', style: TextStyle(fontSize: 14)),
              tilePadding: EdgeInsets.zero,
              childrenPadding: const EdgeInsets.only(bottom: 8),
              children: [
                TextFormField(
                  decoration: const InputDecoration(
                    labelText: 'Member ID', 
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.person),
                  ),
                  onChanged: (val) => line.memberId = val,
                  onSaved: (val) => line.memberId = val,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  decoration: const InputDecoration(
                    labelText: 'Line Description', 
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.note),
                  ),
                  onChanged: (val) => line.description = val,
                  onSaved: (val) => line.description = val,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
