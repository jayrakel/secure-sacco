import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../data/accounting_repository.dart';
import '../data/sacco_expense_dto.dart';

const _expenseAccounts = [
  {'code': '5230', 'label': 'Salaries & Wages'},
  {'code': '5240', 'label': 'Staff Allowances & Benefits'},
  {'code': '5250', 'label': 'Rent & Rates'},
  {'code': '5260', 'label': 'Printing & Stationery'},
  {'code': '5270', 'label': 'Travel & Transport'},
  {'code': '5280', 'label': 'Electricity & Water'},
  {'code': '5290', 'label': 'Internet & Telephone'},
  {'code': '5310', 'label': 'Committee Allowances'},
  {'code': '5320', 'label': 'AGM & Education Expenses'},
  {'code': '5330', 'label': 'Audit Fees'},
  {'code': '5340', 'label': 'Legal & Professional Fees'},
  {'code': '5350', 'label': 'Licenses & Permits'},
];

class RecordExpenseScreen extends ConsumerStatefulWidget {
  const RecordExpenseScreen({super.key});

  @override
  ConsumerState<RecordExpenseScreen> createState() => _RecordExpenseScreenState();
}

class _RecordExpenseScreenState extends ConsumerState<RecordExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountCtrl = TextEditingController();
  final _narrationCtrl = TextEditingController();
  final _referenceCtrl = TextEditingController();
  
  DateTime _expenseDate = DateTime.now();
  String? _selectedGlCode;
  bool _isSaving = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _narrationCtrl.dispose();
    _referenceCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (date != null) {
      setState(() {
        _expenseDate = date;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedGlCode == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an expense account')));
      return;
    }

    setState(() => _isSaving = true);
    try {
      final repo = ref.read(accountingRepositoryProvider);
      await repo.recordSaccoExpense(
        RecordSaccoExpenseRequestDto(
          expenseDate: DateFormat('yyyy-MM-dd').format(_expenseDate.toLocal()),
          amount: double.parse(_amountCtrl.text),
          glAccountCode: _selectedGlCode!,
          narration: _narrationCtrl.text.trim(),
          reference: _referenceCtrl.text.trim(),
        )
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Expense recorded successfully')));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Record Expense'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            InkWell(
              onTap: _pickDate,
              borderRadius: BorderRadius.circular(8),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Expense Date *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.calendar_today),
                ),
                child: Text(DateFormat('MMM d, yyyy').format(_expenseDate.toLocal())),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _amountCtrl,
              decoration: const InputDecoration(
                labelText: 'Amount (KES) *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.attach_money),
              ),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (double.tryParse(v) == null || double.parse(v) <= 0) return 'Invalid amount';
                return null;
              },
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedGlCode,
              decoration: const InputDecoration(
                labelText: 'Expense Category (GL Account) *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.account_balance_wallet),
              ),
              items: _expenseAccounts.map((account) {
                return DropdownMenuItem(
                  value: account['code'],
                  child: Text('${account['label']} (${account['code']})'),
                );
              }).toList(),
              onChanged: (val) => setState(() => _selectedGlCode = val),
              validator: (v) => v == null ? 'Required' : null,
              isExpanded: true,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _narrationCtrl,
              decoration: const InputDecoration(
                labelText: 'Narration / Description *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.description),
                hintText: 'e.g. Office rent for August 2026',
              ),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _referenceCtrl,
              decoration: const InputDecoration(
                labelText: 'Reference (Optional)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.receipt),
                hintText: 'e.g. INV-2026-001',
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _submit,
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Record Expense', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
