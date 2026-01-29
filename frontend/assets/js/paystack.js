
const Pay = (() => {
  function toast(msg){
    const el = document.getElementById("authState");
    el.style.display = "block";
    el.textContent = msg;
    setTimeout(()=>{ el.style.display = "none"; }, 4200);
  }

  async function verify(reference){
    // backend verification
    const data = await Auth.api(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`, { method:"GET" });
    return data;
  }

  function startPayment({ email, amountNgn, onSuccess, onClose }){
    const key = window.PISGAH_CONFIG.PAYSTACK_PUBLIC_KEY;
    if(!key || key.includes("YOUR_PAYSTACK_PUBLIC_KEY")){
      toast("Add your Paystack PUBLIC key in frontend/assets/js/config.js");
      return;
    }
    const handler = PaystackPop.setup({
      key,
      email,
      amount: Math.round(amountNgn * 100), // kobo
      currency: "NGN",
      ref: "PISGAH_" + Math.random().toString(36).slice(2, 12).toUpperCase(),
      metadata: { custom_fields: [{ display_name: "Product", variable_name:"product", value:"Pisgah Pro (Semester)" }] },
      callback: function(response){ onSuccess?.(response.reference); },
      onClose: function(){ onClose?.(); }
    });
    handler.openIframe();
  }

  return { startPayment, verify, toast };
})();
