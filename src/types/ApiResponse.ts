
export interface ApiResponse<D = unknown>{
  success: boolean;
  message: string;
  data?: D | null;
  error?: unknown;
}