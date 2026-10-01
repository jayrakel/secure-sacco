import 'package:dio/dio.dart';
import 'loan_dto.dart';

class LoanRepository {
  final Dio _dio;

  LoanRepository(this._dio);

  // ── Member endpoints ──────────────────────────────────────────

  Future<List<LoanProduct>> getProducts() async {
    final response = await _dio.get('/api/v1/loans/products?activeOnly=true');
    return (response.data as List).map((e) => LoanProduct.fromJson(e)).toList();
  }

  Future<LoanEligibility> getEligibility() async {
    final response = await _dio.get('/api/v1/loans/applications/eligibility');
    return LoanEligibility.fromJson(response.data);
  }

  Future<List<LoanApplication>> getMyApplications() async {
    final response = await _dio.get('/api/v1/loans/applications/my');
    return (response.data as List).map((e) => LoanApplication.fromJson(e)).toList();
  }

  Future<LoanApplication> createApplication(CreateApplicationRequest request) async {
    final response = await _dio.post('/api/v1/loans/applications', data: request.toJson());
    return LoanApplication.fromJson(response.data);
  }

  Future<String> payFee(String id, String phoneNumber) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/pay-fee', data: {'phoneNumber': phoneNumber});
    return response.data['checkoutRequestID'] as String;
  }

  Future<LoanGuarantor> addGuarantor(String id, AddGuarantorRequest request) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/guarantors', data: request.toJson());
    return LoanGuarantor.fromJson(response.data);
  }

  Future<void> removeGuarantor(String id, String guarantorId) async {
    await _dio.delete('/api/v1/loans/applications/$id/guarantors/$guarantorId');
  }

  Future<LoanApplication> submitApplication(String id) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/submit');
    return LoanApplication.fromJson(response.data);
  }

  Future<LoanSummary> getLoanSummary(String id) async {
    final response = await _dio.get('/api/v1/loans/reports/$id/summary/member');
    return LoanSummary.fromJson(response.data);
  }

  Future<String> repayLoan(String id, String phoneNumber, double amount) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/repay', data: {
      'phoneNumber': phoneNumber,
      'amount': amount,
    });
    return response.data['checkoutRequestID'] as String;
  }

  Future<List<MyGuarantorRequestResponse>> getMyGuarantorRequests() async {
    final response = await _dio.get('/api/v1/loans/applications/guarantor-requests/my-requests');
    return (response.data as List).map((e) => MyGuarantorRequestResponse.fromJson(e)).toList();
  }

  Future<void> respondToGuarantorRequest(String applicationId, String guarantorId, String status) async {
    await _dio.patch('/api/v1/loans/applications/$applicationId/guarantors/$guarantorId/respond', data: {'status': status});
  }

  // ── Staff: loan applications ───────────────────────────────────

  Future<List<LoanApplication>> getAllApplications() async {
    final response = await _dio.get('/api/v1/loans/applications/all');
    final data = response.data;
    final content = data['content'] ?? data;
    return (content as List).map((e) => LoanApplication.fromJson(e)).toList();
  }

  Future<LoanApplication> verifyApplication(String id, String notes) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/verify', data: {'notes': notes});
    return LoanApplication.fromJson(response.data);
  }

  Future<LoanApplication> committeeApprove(String id, String notes) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/approve', data: {'notes': notes});
    return LoanApplication.fromJson(response.data);
  }

  Future<LoanApplication> rejectApplication(String id, String notes) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/reject', data: {'notes': notes});
    return LoanApplication.fromJson(response.data);
  }

  Future<LoanApplication> disburseLoan(String id) async {
    final response = await _dio.post('/api/v1/loans/applications/$id/disburse');
    return LoanApplication.fromJson(response.data);
  }

  // ── Staff: loan products ───────────────────────────────────────

  Future<List<LoanProduct>> getAllProducts() async {
    final response = await _dio.get('/api/v1/loans/products?activeOnly=false');
    return (response.data as List).map((e) => LoanProduct.fromJson(e)).toList();
  }

  Future<LoanProduct> createProduct(LoanProductRequest request) async {
    final response = await _dio.post('/api/v1/loans/products', data: request.toJson());
    return LoanProduct.fromJson(response.data);
  }

  Future<LoanProduct> updateProduct(String id, LoanProductRequest request) async {
    final response = await _dio.put('/api/v1/loans/products/$id', data: request.toJson());
    return LoanProduct.fromJson(response.data);
  }

  Future<LoanProduct> toggleProduct(LoanProduct product) async {
    final request = LoanProductRequest(
      name: product.name,
      description: product.description,
      repaymentFrequency: product.repaymentFrequency,
      termWeeks: product.termWeeks,
      interestModel: product.interestModel,
      interestRate: product.interestRate,
      applicationFee: product.applicationFee,
      gracePeriodDays: product.gracePeriodDays,
      isActive: !product.isActive,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
    );
    final response = await _dio.put('/api/v1/loans/products/${product.id}', data: request.toJson());
    return LoanProduct.fromJson(response.data);
  }
}
