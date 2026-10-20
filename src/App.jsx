import { useState, useEffect } from 'react'

function App() {
  const [currentView, setCurrentView] = useState('store') 
  const [medicines, setMedicines] = useState([])
  const [cart, setCart] = useState([])
  const [orders, setOrders] = useState([])
  
  const [selectedMed, setSelectedMed] = useState(null)
  const [editingMed, setEditingMed] = useState(null) // Edit modal state
  
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkoutData, setCheckoutData] = useState({ customerName: '', phone: '', address: '', paymentMethod: 'COD', transactionId: '', prescriptionFile: null })
  
  const [newMed, setNewMed] = useState({ name: '', formula: '', price: '', stock: '', expiryDate: '', imageUrl: '', imageFile: null })

  const [toast, setToast] = useState(null)
  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadMedicines = async () => {
    try {
      const res = await fetch('https://pharma-backend-pgj5.onrender.com/api/medicines')
      const data = await res.json()
      setMedicines(data)
    } catch (e) { console.error(e) }
  }

  const loadOrders = async () => {
    try {
      const res = await fetch('https://pharma-backend-pgj5.onrender.com/api/orders')
      const data = await res.json()
      setOrders(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadMedicines() }, [])

  useEffect(() => {
    let interval;
    if (isAdmin && currentView === 'adminDashboard') {
      interval = setInterval(() => { loadOrders() }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAdmin, currentView])

  const addToCart = (med) => {
    const existing = cart.find(item => item._id === med._id)
    if (existing) {
      if (existing.cartQuantity < med.stock) {
        setCart(cart.map(item => item._id === med._id ? { ...item, cartQuantity: item.cartQuantity + 1 } : item))
        showNotification(`${med.name} Add to cart!`, 'success')
      } else { showNotification("out of stack", 'error') }
    } else {
      setCart([...cart, { ...med, cartQuantity: 1 }])
      showNotification(`${med.name} ADD to card!`, 'success')
    }
  }

  const buyNow = (med) => {
    const existing = cart.find(item => item._id === med._id)
    if (!existing) {
        setCart([...cart, { ...med, cartQuantity: 1 }])
    }
    setSelectedMed(null)
    setCurrentView('cart')
  }

  const removeFromCart = (id) => setCart(cart.filter(item => item._id !== id))
  
  const cartSubTotal = cart.reduce((total, item) => total + (item.price * item.cartQuantity), 0)
  const deliveryCharges = (cartSubTotal > 0 && cartSubTotal < 1500) ? 250 : 0
  const cartTotal = cartSubTotal + deliveryCharges

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (cart.length === 0) return showNotification("Cart is empty", 'error')
    if (checkoutData.paymentMethod === 'JazzCash' && checkoutData.transactionId.length < 11) {
        return showNotification("Sahi JazzCash TID darj karein!", 'error')
    }
    
    const formData = new FormData()
    formData.append('customerName', checkoutData.customerName)
    formData.append('phone', checkoutData.phone)
    formData.append('address', checkoutData.address)
    formData.append('paymentMethod', checkoutData.paymentMethod)
    formData.append('transactionId', checkoutData.transactionId)
    formData.append('totalBill', cartTotal)
    formData.append('items', JSON.stringify(cart))
    if (checkoutData.prescriptionFile) {
        formData.append('prescription', checkoutData.prescriptionFile)
    }

    const res = await fetch('https://pharma-backend-pgj5.onrender.com/api/orders', {
      method: 'POST',
      body: formData
    })
    
    if (res.ok) {
      showNotification("Order Successfully Placed!", 'success')
      setCart([])
      setCheckoutData({ customerName: '', phone: '', address: '', paymentMethod: 'COD', transactionId: '', prescriptionFile: null })
      setCurrentView('store')
      loadMedicines()
    } else { showNotification("Order place karne mein masla aya.", 'error') }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const res = await fetch('https://pharma-backend-pgj5.onrender.com/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    })
    if (res.ok) {
      setIsAdmin(true)
      setCurrentView('adminDashboard')
      loadOrders()
      showNotification("Welcome Admin!", 'success')
    } else { showNotification("invalid Email or Password!", 'error') }
  }

  const updateOrderStatus = async (id, newStatus) => {
    await fetch(`https://pharma-backend-pgj5.onrender.com/api/orders/status/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    loadOrders()
  }

  const sendWhatsApp = (order) => {
    const itemNames = order.items.map(i => `${i.name} (x${i.cartQuantity})`).join(', ');
    let msg = `Assalam o Alaikum ${order.customerName }!\n\nPharmaCare Order Details:\n📦 Status: *${order.status}*\n💊 Medicines: ${itemNames}\n💰 Total Bill: Rs ${order.totalBill}\n\nThankyou for choosing pharmacare!`;
    let phone = order.phone.replace(/\D/g, ''); 
    if(phone.startsWith('0')) { phone = '92' + phone.substring(1); }
    window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  }

  const sendSMS = (order) => {
    const itemNames = order.items.map(i => `${i.name} (x${i.cartQuantity})`).join(', ');
    let msg = `Assalam o Alaikum ${order.customerName}! PharmaCare: Order ab ${order.status} hai. Bill: Rs ${order.totalBill}`;
    window.location.href = `sms:${order.phone}?body=${encodeURIComponent(msg)}`;
  }

  const handleAddMedicine = async (e) => {
    e.preventDefault()
    const formData = new FormData();
    formData.append('name', newMed.name);
    formData.append('formula', newMed.formula);
    formData.append('price', newMed.price);
    formData.append('stock', newMed.stock);
    formData.append('expiryDate', newMed.expiryDate);
    formData.append('imageUrl', newMed.imageUrl);
    if (newMed.imageFile) formData.append('image', newMed.imageFile);

    await fetch('https://pharma-backend-pgj5.onrender.com/api/medicines', { method: 'POST', body: formData })
    setNewMed({ name: '', formula: '', price: '', stock: '', expiryDate: '', imageUrl: '', imageFile: null })
    if(document.getElementById("fileInput")) document.getElementById("fileInput").value = "";
    loadMedicines()
    showNotification("Medicine add ho gayi!", 'success')
  }

  // UPDATE / EDIT MEDICINE SUBMIT
  const handleUpdateMedicine = async (e) => {
    e.preventDefault()
    const formData = new FormData();
    formData.append('name', editingMed.name);
    formData.append('formula', editingMed.formula);
    formData.append('price', editingMed.price);
    formData.append('stock', editingMed.stock);
    formData.append('expiryDate', editingMed.expiryDate);
    formData.append('imageUrl', editingMed.imageUrl || "");
    if (editingMed.imageFile) formData.append('image', editingMed.imageFile);

    await fetch(`https://pharma-backend-pgj5.onrender.com/api/medicines/${editingMed._id}`, { method: 'PUT', body: formData })
    setEditingMed(null)
    loadMedicines()
    showNotification("Medicine update ho gayi!", 'success')
  }

  const handleDeleteMedicine = async (id) => {
    if (window.confirm("Delete this medicine?")) {
      await fetch(`https://pharma-backend-pgj5.onrender.com/api/medicines/${id}`, { method: 'DELETE' })
      loadMedicines()
      showNotification("Medicine delete ho gayi!", 'success')
    }
  }

  const fixPictures = async () => {
    if (window.confirm("Sample medicines load ki jayen?")) {
      await fetch('https://pharma-backend-pgj5.onrender.com/api/seed-medicines')
      loadMedicines()
      showNotification("Sample medicines loaded!", 'success')
    }
  }

  const lowStockAlerts = medicines.filter(m => m.stock < 10);
  const expiryAlerts = medicines.filter(m => {
    const daysLeft = (new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 60;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12 relative">
      
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] px-6 py-3 rounded-xl shadow-2xl text-white font-bold transition-all transform duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {editingMed && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 relative">
                  <button onClick={() => setEditingMed(null)} className="absolute top-4 right-4 text-gray-400 hover:text-rose-500 text-2xl font-bold bg-gray-100 rounded-full w-10 h-10 flex justify-center items-center">×</button>
                  <h3 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">Edit Medicine</h3>
                  <form onSubmit={handleUpdateMedicine} className="space-y-3">
                      <div><label className="block text-xs font-bold uppercase mb-1">Name</label><input type="text" required value={editingMed.name} onChange={(e) => setEditingMed({...editingMed, name: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium" /></div>
                      <div><label className="block text-xs font-bold uppercase mb-1">Formula</label><input type="text" required value={editingMed.formula} onChange={(e) => setEditingMed({...editingMed, formula: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium" /></div>
                      <div className="flex gap-3">
                          <div className="w-1/2"><label className="block text-xs font-bold uppercase mb-1">Price</label><input type="number" required value={editingMed.price} onChange={(e) => setEditingMed({...editingMed, price: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium" /></div>
                          <div className="w-1/2"><label className="block text-xs font-bold uppercase mb-1">Stock</label><input type="number" required value={editingMed.stock} onChange={(e) => setEditingMed({...editingMed, stock: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium" /></div>
                      </div>
                      <div><label className="block text-xs font-bold uppercase mb-1">Expiry Date</label><input type="date" required value={editingMed.expiryDate} onChange={(e) => setEditingMed({...editingMed, expiryDate: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium" /></div>
                      <div><label className="block text-xs font-bold uppercase mb-1">Image URL</label><input type="text" value={editingMed.imageUrl} onChange={(e) => setEditingMed({...editingMed, imageUrl: e.target.value})} className="w-full border p-2.5 rounded-xl bg-gray-50 font-medium text-xs" /></div>
                      <div><label className="block text-xs font-bold uppercase mb-1">Or Upload New Image</label><input type="file" accept="image/*" onChange={(e) => setEditingMed({...editingMed, imageFile: e.target.files[0]})} className="w-full text-xs border p-1 rounded-xl bg-gray-50" /></div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl shadow-lg mt-4">Save Changes</button>
                  </form>
              </div>
          </div>
      )}

      {selectedMed && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4">
              <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-fadeIn">
                  <button onClick={() => setSelectedMed(null)} className="absolute top-4 right-4 text-gray-400 hover:text-rose-500 text-2xl font-bold bg-gray-100 hover:bg-gray-200 rounded-full w-10 h-10 flex justify-center items-center transition">×</button>
                  <div className="md:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 flex justify-center items-center">
                      <img src={selectedMed.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} alt={selectedMed.name} className="max-h-64 object-contain rounded-2xl shadow-md border border-white" />
                  </div>
                  <div className="md:w-1/2 p-8 flex flex-col justify-center">
                      <span className="text-indigo-600 font-extrabold text-xs uppercase tracking-widest mb-1">PharmaCare Certified</span>
                      <h2 className="text-3xl font-black text-gray-900 mb-2">{selectedMed.name}</h2>
                      <p className="text-gray-500 text-sm mb-4">Formula: <span className="font-semibold text-gray-700">{selectedMed.formula}</span></p>
                      
                      <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl mb-6">
                        <span className="text-4xl font-black text-blue-700">Rs {selectedMed.price}</span>
                        <p className="text-xs text-blue-600 mt-1 font-medium">✓ 100% Genuine Medicine Guaranteed</p>
                      </div>

                      <div className="flex items-center gap-3 mb-8">
                          <span className="font-semibold text-gray-700 text-sm">Status:</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${selectedMed.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {selectedMed.stock > 0 ? `${selectedMed.stock} Units in Stock` : 'Out of Stock'}
                          </span>
                      </div>

                      <div className="flex gap-3 mt-auto">
                          <button onClick={() => addToCart(selectedMed)} disabled={selectedMed.stock <= 0} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition disabled:bg-gray-200 disabled:shadow-none">Add to Cart</button>
                          <button onClick={() => buyNow(selectedMed)} disabled={selectedMed.stock <= 0} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition disabled:bg-gray-200 disabled:shadow-none">Buy Now</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <nav className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 shadow-xl sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 onClick={() => setCurrentView('store')} className="text-2xl font-black tracking-wider cursor-pointer flex items-center gap-2">
            🏥 PHARMA<span className="text-blue-400">CARE</span>
          </h1>
          <div className="flex space-x-3 md:space-x-6 items-center">
            <button onClick={() => setCurrentView('store')} className="hover:text-blue-200 font-semibold transition hidden md:block">Store</button>
            <button onClick={() => setCurrentView('cart')} className="bg-amber-500 hover:bg-amber-600 px-4 py-2.5 rounded-2xl font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2">
              🛒 Cart <span className="bg-white text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-black">{cart.length}</span>
            </button>
            <button onClick={() => isAdmin ? setCurrentView('adminDashboard') : setCurrentView('adminLogin')} className="bg-slate-800 hover:bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition shadow-md">
              Admin Portal
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 md:p-6 mt-4">

        {currentView === 'store' && (
          <div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-3xl shadow-xl mb-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]"></div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight">PharmaCare & Healthcare Mart</h2>
              <p className="text-blue-100 mt-2 font-medium">Genuine Medicines & First Aid Delivered Fast • Free Delivery over Rs 1500</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {medicines.map((med) => (
                <div key={med._id} className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition duration-300 overflow-hidden flex flex-col border border-gray-100 cursor-pointer group transform hover:-translate-y-1" onClick={() => setSelectedMed(med)}>
                  <div className="h-44 w-full bg-gray-50 p-4 overflow-hidden relative flex justify-center items-center">
                    <div className="absolute inset-0 bg-blue-900/0 group-hover:bg-blue-900/10 transition z-10 flex justify-center items-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 font-bold bg-blue-600 px-4 py-2 rounded-xl text-xs shadow-lg transition transform translate-y-2 group-hover:translate-y-0">Quick View</span>
                    </div>
                    <img src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} alt={med.name} className="max-h-full object-contain transition duration-500 group-hover:scale-110" />
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-800 text-base line-clamp-1">{med.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{med.formula}</p>
                    <div className="mt-3 mb-4 flex justify-between items-center">
                      <span className="font-black text-blue-700 text-lg">Rs {med.price}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${med.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {med.stock > 0 ? 'In Stock' : 'Out'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => addToCart(med)} disabled={med.stock <= 0} className={`flex-1 py-2 rounded-xl font-bold transition text-xs ${med.stock > 0 ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Cart</button>
                        <button onClick={() => buyNow(med)} disabled={med.stock <= 0} className={`flex-1 py-2 rounded-xl font-bold transition text-xs ${med.stock > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Buy</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'cart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100 h-fit">
              <h2 className="text-2xl font-black text-gray-800 border-b pb-4 mb-6">Shopping Cart ({cart.length})</h2>
              {cart.length === 0 ? <p className="text-center text-gray-400 py-12 font-medium">Your cart is empty.</p> : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-center justify-between border-b pb-4">
                      <div className="flex items-center gap-4">
                        <img src={item.imageUrl} className="w-16 h-16 object-contain bg-gray-50 rounded-2xl p-1 border border-gray-100" />
                        <div><h4 className="font-bold text-gray-800">{item.name}</h4><p className="text-xs text-gray-400">Rs {item.price} x {item.cartQuantity}</p></div>
                      </div>
                      <div className="flex items-center gap-4"><span className="font-black text-blue-700 text-lg">Rs {item.price * item.cartQuantity}</span><button onClick={() => removeFromCart(item._id)} className="bg-rose-50 text-rose-600 w-8 h-8 rounded-full font-bold hover:bg-rose-100 transition flex justify-center items-center">×</button></div>
                    </div>
                  ))}
                  
                  <div className="bg-gray-50 p-6 rounded-2xl mt-6 space-y-3">
                    <div className="flex justify-between text-gray-600 font-medium"><span>Subtotal:</span> <span>Rs {cartSubTotal}</span></div>
                    <div className="flex justify-between text-gray-600 font-medium">
                      <span>Delivery Charges: <span className="text-xs text-emerald-600 ml-1 font-semibold">(Free &gt; Rs 1500)</span></span> 
                      <span>Rs {deliveryCharges}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-black text-gray-900 border-t border-gray-200 pt-3">
                      <span>Total:</span> <span className="text-blue-700">Rs {cartTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 h-fit border-t-8 border-blue-600 border-x border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-800 border-b pb-4 mb-6">Checkout & Prescription</h2>
              <form onSubmit={handleCheckout} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label><input type="text" required onChange={(e) => setCheckoutData({...checkoutData, customerName: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">WhatsApp / Phone</label><input type="text" placeholder="03xxxxxxxxx" required onChange={(e) => setCheckoutData({...checkoutData, phone: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium" /></div>
                <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Delivery Address</label><textarea required rows="2" onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"></textarea></div>
                
                {/* DOCTOR PRESCRIPTION UPLOAD */}
                <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl">
                    <label className="block text-xs font-black text-indigo-900 uppercase mb-1">Upload Doctor Prescription (Optional)</label>
                    <input type="file" accept="image/*" onChange={(e) => setCheckoutData({...checkoutData, prescriptionFile: e.target.files[0]})} className="w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
                  <select onChange={(e) => setCheckoutData({...checkoutData, paymentMethod: e.target.value, transactionId: ''})} className="w-full border border-gray-200 p-3 rounded-xl outline-none font-bold bg-gray-50 text-blue-900">
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="JazzCash">JazzCash Online Payment</option>
                  </select>
                  
                  {checkoutData.paymentMethod === 'JazzCash' && (
                    <div className="mt-3 p-4 bg-rose-50/60 border border-rose-200 rounded-2xl relative">
                      <h4 className="font-black text-rose-700 mb-1 flex items-center gap-2 text-sm">📱 JazzCash Gateway</h4>
                      <p className="text-xs text-gray-600 mb-2">Send <b>Rs {cartTotal}</b> to Account:</p>
                      <div className="bg-white p-2.5 rounded-xl text-center mb-3 border border-rose-100 shadow-sm">
                        <span className="text-xl tracking-widest font-black text-gray-900">03095518882</span>
                      </div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">12-Digit TID Number *</label>
                      <input type="text" required placeholder="e.g. 012345678912" onChange={(e) => setCheckoutData({...checkoutData, transactionId: e.target.value})} className="w-full border border-rose-200 p-2.5 rounded-xl outline-none bg-white text-center font-mono tracking-widest text-sm" />
                    </div>
                  )}
                </div>
                <button type="submit" disabled={cart.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 transition disabled:bg-gray-300 mt-4 uppercase tracking-wider text-sm">Confirm & Place Order</button>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN LOGIN */}
        {currentView === 'adminLogin' && (
          <div className="max-w-md mx-auto bg-white p-8 md:p-10 rounded-3xl shadow-2xl mt-12 border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 text-center mb-6">Admin Secure Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Admin Email</label><input type="email" value={loginData.email} onChange={(e) => setLoginData({...loginData, email: e.target.value})} required className="w-full border border-gray-200 p-3.5 rounded-xl outline-none bg-gray-50 font-medium" /></div>
              <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label><input type="password" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} required className="w-full border border-gray-200 p-3.5 rounded-xl outline-none bg-gray-50 font-medium" /></div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl transition mt-2">Access Dashboard</button>
            </form>
          </div>
        )}

        {/* ADMIN DASHBOARD */}
        {currentView === 'adminDashboard' && isAdmin && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div><h2 className="text-2xl font-black">Admin Dashboard</h2><p className="text-slate-400 text-sm mt-1">Manage Orders, Inventory, and Prescriptions</p></div>
              <div className="flex gap-3">
                <button onClick={fixPictures} className="bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition">Load Samples</button>
                <button onClick={() => {setIsAdmin(false); setCurrentView('store')}} className="bg-rose-600 hover:bg-rose-700 px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition">Logout</button>
              </div>
            </div>

            {/* ALERTS */}
            {(lowStockAlerts.length > 0 || expiryAlerts.length > 0) && (
              <div className="space-y-3">
                {lowStockAlerts.length > 0 && (
                  <div className="bg-rose-50 border-l-4 border-rose-600 text-rose-900 p-4 rounded-2xl shadow-sm">
                    <strong className="block mb-1 font-black">⚠️ Low Stock Alert:</strong>
                    <ul className="list-disc pl-5 text-sm font-medium">
                      {lowStockAlerts.map(m => (<li key={m._id}>{m.name} (Only {m.stock} left)</li>))}
                    </ul>
                  </div>
                )}
                {expiryAlerts.length > 0 && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-2xl shadow-sm">
                    <strong className="block mb-1 font-black">⚠️ Expiry Alert (Next 60 Days):</strong>
                    <ul className="list-disc pl-5 text-sm font-medium">
                      {expiryAlerts.map(m => (<li key={m._id}>{m.name} (Exp: {new Date(m.expiryDate).toLocaleDateString()})</li>))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TABLE WITH PRESCRIPTION VIEW */}
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-100 overflow-hidden">
              <h3 className="text-xl font-black text-gray-900 mb-6 border-b pb-4">Customer Orders ({orders.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-extrabold tracking-wider border-b">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Prescription</th>
                      <th className="p-4">Total Bill</th>
                      <th className="p-4 text-center">Payment</th>
                      <th className="p-3 text-center">Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {orders.map(order => (
                      <tr key={order._id} className="hover:bg-gray-50/50 transition">
                        <td className="p-4"><p className="font-bold text-gray-900">{order.customerName}</p><p className="text-xs text-gray-400">{order.phone}<br/>{order.address}</p></td>
                        <td className="p-4 text-sm">{order.items.map(i => <div key={i._id}>• {i.name} (x{i.cartQuantity})</div>)}</td>
                        <td className="p-4">
                          {order.prescriptionUrl ? (
                            <a href={order.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-xl text-xs transition border border-indigo-200">
                              📄 View Parchi
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No Parchi</span>
                          )}
                        </td>
                        <td className="p-4 font-black text-blue-700">Rs {order.totalBill}</td>
                        <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-black block mb-1 ${order.paymentMethod === 'COD' ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-800'}`}>{order.paymentMethod}</span>
                            {order.transactionId && <span className="text-[10px] font-mono bg-gray-50 px-1.5 py-0.5 rounded border">TID: {order.transactionId}</span>}
                        </td>
                        <td className="p-4 text-center">
                          <select value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)} className="w-full mb-2 border border-gray-200 p-2 rounded-xl font-bold outline-none cursor-pointer bg-white text-gray-700 text-xs shadow-sm">
                            <option value="Pending">Pending</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => sendWhatsApp(order)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold w-full transition shadow-sm">WhatsApp</button>
                            <button onClick={() => sendSMS(order)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold w-full transition shadow-sm">SMS</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ADD MEDICINE & INVENTORY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 h-fit border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6 border-b pb-4">Add Medicine</h3>
                <form onSubmit={handleAddMedicine} className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Name</label><input type="text" required onChange={(e) => setNewMed({...newMed, name: e.target.value})} value={newMed.name} className="w-full border border-gray-200 p-3 rounded-xl outline-none bg-gray-50 font-medium" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Formula</label><input type="text" required onChange={(e) => setNewMed({...newMed, formula: e.target.value})} value={newMed.formula} className="w-full border border-gray-200 p-3 rounded-xl outline-none bg-gray-50 font-medium" /></div>
                  <div className="flex gap-3">
                    <div className="w-1/2"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price</label><input type="number" required onChange={(e) => setNewMed({...newMed, price: e.target.value})} value={newMed.price} className="w-full border border-gray-200 p-3 rounded-xl outline-none bg-gray-50 font-medium" /></div>
                    <div className="w-1/2"><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock</label><input type="number" required onChange={(e) => setNewMed({...newMed, stock: e.target.value})} value={newMed.stock} className="w-full border border-gray-200 p-3 rounded-xl outline-none bg-gray-50 font-medium" /></div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-700 uppercase mb-1">Expiry Date</label><input type="date" required onChange={(e) => setNewMed({...newMed, expiryDate: e.target.value})} value={newMed.expiryDate} className="w-full border border-gray-200 p-3 rounded-xl outline-none bg-gray-50 font-medium" /></div>
                  
                  <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                    <label className="block text-xs font-black text-indigo-900 uppercase">Product Image</label>
                    <input type="text" placeholder="Image URL" onChange={(e) => setNewMed({...newMed, imageUrl: e.target.value})} value={newMed.imageUrl} className="w-full border border-indigo-200 p-2.5 rounded-xl outline-none text-xs bg-white font-medium" />
                    <div className="text-center text-[10px] font-bold text-indigo-400">OR UPLOAD FILE</div>
                    <input type="file" id="fileInput" accept="image/*" onChange={(e) => setNewMed({...newMed, imageFile: e.target.files[0]})} className="w-full text-xs bg-white p-1.5 rounded-xl border border-indigo-200" />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition mt-2">Save to Inventory</button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-6 md:p-8 border border-gray-100">
                <h3 className="text-xl font-black text-gray-900 mb-6 border-b pb-4">Manage Inventory ({medicines.length})</h3>
                <div className="overflow-y-auto max-h-[550px] pr-2">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase font-extrabold tracking-wider border-b"><th className="p-3 sticky top-0 bg-gray-50 z-10">Medicine</th><th className="p-3 sticky top-0 bg-gray-50 z-10">Price</th><th className="p-3 sticky top-0 bg-gray-50 z-10">Stock</th><th className="p-3 sticky top-0 bg-gray-50 z-10">Action</th></tr></thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {medicines.map(med => (
                        <tr key={med._id} className="hover:bg-gray-50/50 transition">
                          <td className="p-3 flex items-center gap-3">
                            <img src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5e4b6c310?auto=format&fit=crop&w=500&q=80"} className="w-12 h-12 object-contain bg-gray-50 rounded-xl border p-1" />
                            <span className="font-bold text-gray-900">{med.name}</span>
                          </td>
                          <td className="p-3 text-blue-700 font-black">Rs {med.price}</td>
                          <td className="p-3"><span className={`px-2.5 py-1 rounded-lg text-xs font-black ${med.stock < 10 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>{med.stock}</span></td>
                          <td className="p-3 flex gap-2">
                            <button onClick={() => setEditingMed(med)} className="bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">Edit</button>
                            <button onClick={() => handleDeleteMedicine(med._id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-bold transition">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default App
