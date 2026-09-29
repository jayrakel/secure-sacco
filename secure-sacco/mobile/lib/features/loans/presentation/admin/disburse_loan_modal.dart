import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../data/loan_dto.dart';
import '../../../../core/theme/app_colors.dart';
import 'package:intl/intl.dart';

class DisburseLoanModal extends StatefulWidget {
  final LoanApplication application;

  const DisburseLoanModal({super.key, required this.application});

  @override
  State<DisburseLoanModal> createState() => _DisburseLoanModalState();
}

class _DisburseLoanModalState extends State<DisburseLoanModal> {
  final _currencyFormat = NumberFormat.currency(symbol: 'KES ');
  bool _checklistFundsAllocated = false;
  bool _checklistMemberNotified = false;
  bool _checklistChequeSigned = false;
  File? _chequeImage;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _chequeImage = File(pickedFile.path);
      });
    }
  }

  bool get _canDisburse {
    return _checklistFundsAllocated &&
        _checklistMemberNotified &&
        _checklistChequeSigned &&
        _chequeImage != null;
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Disburse Loan',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Member: ${widget.application.memberName}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                'Amount: ${_currencyFormat.format(widget.application.principalAmount)}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),
              const Text(
                'Pre-Disbursement Checklist',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              CheckboxListTile(
                title: const Text('Funds Allocated'),
                value: _checklistFundsAllocated,
                onChanged: (val) => setState(() => _checklistFundsAllocated = val ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              CheckboxListTile(
                title: const Text('Member Notified'),
                value: _checklistMemberNotified,
                onChanged: (val) => setState(() => _checklistMemberNotified = val ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              CheckboxListTile(
                title: const Text('Cheque / Transfer Signed'),
                value: _checklistChequeSigned,
                onChanged: (val) => setState(() => _checklistChequeSigned = val ?? false),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 24),
              const Text(
                'Cheque / Transfer Receipt',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _pickImage,
                child: Container(
                  height: 120,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid),
                    borderRadius: BorderRadius.circular(8),
                    color: Colors.grey.shade100,
                  ),
                  child: _chequeImage == null
                      ? const Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.camera_alt, color: Colors.grey, size: 40),
                            SizedBox(height: 8),
                            Text('Tap to upload photo', style: TextStyle(color: Colors.grey)),
                          ],
                        )
                      : ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(_chequeImage!, fit: BoxFit.cover, width: double.infinity),
                        ),
                ),
              ),
              if (_chequeImage != null)
                TextButton(
                  onPressed: _pickImage,
                  child: const Text('Change Photo'),
                ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _canDisburse ? () => Navigator.pop(context, true) : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.positive,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  disabledBackgroundColor: Colors.grey.shade300,
                ),
                child: const Text('Confirm Disbursement'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
