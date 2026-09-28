import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../data/obligation_dto.dart';
import '../../data/obligation_repository.dart';
import '../../data/obligation_providers.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_styles.dart';
import '../../../members/data/member_dto.dart';
import '../../../members/data/member_repository.dart';

class CreateObligationScreen extends ConsumerStatefulWidget {
  const CreateObligationScreen({super.key});

  @override
  ConsumerState<CreateObligationScreen> createState() => _CreateObligationScreenState();
}

class _CreateObligationScreenState extends ConsumerState<CreateObligationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _memberIdController = TextEditingController();
  final _amountController = TextEditingController();
  final _graceDaysController = TextEditingController(text: '0');
  
  String _frequency = 'MONTHLY';
  DateTime? _startDate;
  bool _isLoading = false;

  Future<void> _selectDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _startDate = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _startDate == null) {
      if (_startDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a start date.')),
        );
      }
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final request = CreateObligationRequest(
        memberId: _memberIdController.text.trim(),
        frequency: _frequency,
        amountDue: double.parse(_amountController.text.trim()),
        startDate: _startDate!.toIso8601String().split('T')[0],
        graceDays: int.tryParse(_graceDaysController.text.trim()) ?? 0,
      );

      final repo = ref.read(obligationRepositoryProvider);
      await repo.createObligation(request);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Obligation created successfully!')),
        );
        ref.invalidate(complianceReportProvider);
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create obligation: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _memberIdController.dispose();
    _amountController.dispose();
    _graceDaysController.dispose();
    super.dispose();
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Text(text, style: AppTextStyles.bodyMedium.copyWith(fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('New Obligation'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildLabel('Member'),
              Autocomplete<MemberDto>(
                displayStringForOption: (option) => '${option.memberNumber} - ${option.firstName} ${option.lastName}',
                optionsBuilder: (textEditingValue) async {
                  if (textEditingValue.text.length < 2) {
                    return const Iterable<MemberDto>.empty();
                  }
                  try {
                    final repo = ref.read(memberRepositoryProvider);
                    final response = await repo.getMembers(
                      query: textEditingValue.text,
                      status: 'ACTIVE',
                      page: 0,
                      size: 6,
                    );
                    return response.content;
                  } catch (e) {
                    return const Iterable<MemberDto>.empty();
                  }
                },
                onSelected: (selection) {
                  _memberIdController.text = selection.id;
                },
                fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                  return TextFormField(
                    controller: controller,
                    focusNode: focusNode,
                    decoration: const InputDecoration(
                      hintText: 'Search by name or number...',
                    ),
                    validator: (value) => _memberIdController.text.isEmpty ? 'Required' : null,
                    onChanged: (v) {
                      // If they clear or type, we reset the selected UUID to ensure they pick from the list
                      _memberIdController.text = '';
                    },
                  );
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              _buildLabel('Amount Due (KES)'),
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: 'e.g. 500',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Required';
                  if (double.tryParse(value) == null) return 'Enter a valid number';
                  return null;
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              _buildLabel('Frequency'),
              DropdownButtonFormField<String>(
                initialValue: _frequency,
                decoration: const InputDecoration(),
                items: const [
                  DropdownMenuItem(value: 'MONTHLY', child: Text('Monthly')),
                  DropdownMenuItem(value: 'WEEKLY', child: Text('Weekly')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _frequency = val;
                    });
                  }
                },
              ),
              const SizedBox(height: AppSpacing.lg),

              _buildLabel('Start Date'),
              InkWell(
                onTap: () => _selectDate(context),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.grey.withAlpha(50)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _startDate != null ? DateFormat('yyyy-MM-dd').format(_startDate!.toLocal()) : 'Select start date',
                        style: TextStyle(color: _startDate != null ? AppColors.textPrimary : Colors.grey),
                      ),
                      const Icon(Icons.calendar_today, size: 20, color: AppColors.textSecondary),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              _buildLabel('Grace Days (Optional)'),
              TextFormField(
                controller: _graceDaysController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  hintText: '0',
                ),
              ),
              const SizedBox(height: AppSpacing.xl * 2),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Create Obligation', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
