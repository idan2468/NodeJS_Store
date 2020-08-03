const deleteCallBack = (btn) => {
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const prodElement = btn.closest('article');
    fetch('/admin/product/' + prodId, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrf
        }
    })
        .then(res => {
            return res.json();
        })
        .then(data => {
            console.log(data);
            prodElement.remove();
        })
        .catch(err => console.log(err));
}